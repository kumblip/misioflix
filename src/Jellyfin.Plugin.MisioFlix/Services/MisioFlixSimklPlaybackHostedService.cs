using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Jellyfin server playback events: works for web, Android and native clients.
/// Threshold is >=75%, or genuine consecutive-episode autoplay after at least
/// one minute of playback (not merely opening and skipping an episode).
/// Errors are logged and queued, never thrown into Jellyfin's playback pipeline.
/// </summary>
public sealed class MisioFlixSimklPlaybackHostedService : IHostedService
{
    private sealed class Playing
    {
        public Guid ItemId;
        public Guid SeriesId;
        public int Season;
        public int Episode;
        public long MaxTicks;
        public long RuntimeTicks;
        public DateTimeOffset LastActivity=DateTimeOffset.UtcNow;
        public bool Submitted;
        public SimklMediaTarget Target=null!;
    }
    private readonly ISessionManager _sessions;
    private readonly ILibraryManager _library;
    private readonly MisioFlixSimklService _simkl;
    private readonly ILogger<MisioFlixSimklPlaybackHostedService> _logger;
    private readonly object _gate=new();
    private readonly Dictionary<string,Playing> _active=new(StringComparer.Ordinal);
    private const double Threshold=0.75;

    public MisioFlixSimklPlaybackHostedService(ISessionManager sessions,ILibraryManager library,
        MisioFlixSimklService simkl,ILogger<MisioFlixSimklPlaybackHostedService> logger)
    { _sessions=sessions;_library=library;_simkl=simkl;_logger=logger; }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _sessions.PlaybackStart+=Start;
        _sessions.PlaybackProgress+=Progress;
        _sessions.PlaybackStopped+=Stop;
        return Task.CompletedTask;
    }
    public Task StopAsync(CancellationToken cancellationToken)
    {
        _sessions.PlaybackStart-=Start;
        _sessions.PlaybackProgress-=Progress;
        _sessions.PlaybackStopped-=Stop;
        lock(_gate)_active.Clear();
        return Task.CompletedTask;
    }
    private static string Device(string user,PlaybackProgressEventArgs e)=>user+":"+
        (!string.IsNullOrWhiteSpace(e.DeviceId)?e.DeviceId:e.Session?.Id??"unknown");
    private static long Position(PlaybackProgressEventArgs e)=>Math.Max(0,e.PlaybackPositionTicks??0);

    private bool IsAnime(BaseItem item,BaseItem mediaRoot)
    {
        var animeRoot=Plugin.Instance?.Configuration.AnimeRoot;
        if(string.IsNullOrWhiteSpace(animeRoot))return false;
        try
        {
            var root=Path.GetFullPath(animeRoot).TrimEnd(Path.DirectorySeparatorChar)+Path.DirectorySeparatorChar;
            return new[]{item.Path,mediaRoot.Path}.Any(path=>!string.IsNullOrWhiteSpace(path)&&
                Path.GetFullPath(path).StartsWith(root,StringComparison.OrdinalIgnoreCase));
        }
        catch(Exception ex) when(ex is ArgumentException or NotSupportedException or PathTooLongException)
        {return true;} // fail closed: never upload an unverified anime-library item
    }
    private Playing? Prepare(BaseItem item)
    {
        if(item.RunTimeTicks.GetValueOrDefault()<=0)return null;
        BaseItem root;
        Guid seriesId=Guid.Empty;int season=0,episodeNumber=0;
        if(item is Episode ep)
        {
            if(ep.IndexNumber.GetValueOrDefault()<1||!ep.ParentIndexNumber.HasValue||ep.ParentIndexNumber.Value<0)return null;
            seriesId=ep.SeriesId;
            if(seriesId==Guid.Empty)return null;
            root=_library.GetItemById(seriesId);
            if(root is not Series)return null;
            season=ep.ParentIndexNumber.Value;episodeNumber=ep.IndexNumber.Value;
        }
        else if(item is Movie)root=item;
        else return null;
        if(IsAnime(item,root))return null;
        var ids=new Dictionary<string,string>(StringComparer.OrdinalIgnoreCase);
        if(root.ProviderIds is not null)
            foreach(var pair in root.ProviderIds)
            {
                var key=pair.Key.ToLowerInvariant();
                if(key is not ("tmdb" or "imdb" or "tvdb"))continue;
                var value=pair.Value?.Trim()??"";
                var valid=key=="imdb"?
                    System.Text.RegularExpressions.Regex.IsMatch(value,@"^tt\d{5,12}$",System.Text.RegularExpressions.RegexOptions.IgnoreCase):
                    System.Text.RegularExpressions.Regex.IsMatch(value,@"^\d{1,14}$");
                if(valid)ids[key]=value;
            }
        if(ids.Count==0)return null;
        var target=new SimklMediaTarget(true,item is Movie?"movies":"shows",
            item is Movie?null:season,ids,root.Name,
            root.ProductionYear is >=1888 and <=2100?root.ProductionYear:null);
        return new Playing{ItemId=item.Id,SeriesId=seriesId,Season=season,Episode=episodeNumber,
            RuntimeTicks=item.RunTimeTicks.Value,Target=target};
    }
    private void Send(string user,Playing playing)
    {
        // Never block Jellyfin events or fail the playback request.
        _=Task.Run(async()=>
        {
            try{await _simkl.RecordPlaybackWatchedAsync(user,playing.Target,
                    playing.Target.Kind=="shows"?playing.Episode:null,CancellationToken.None).ConfigureAwait(false);}
            catch(Exception ex){_logger.LogWarning(ex,"MisioFlix Simkl: queued/failed playback sync for user {User}",user);}
        });
    }
    private void Observe(PlaybackProgressEventArgs e,bool isStart,bool isStop,bool completed=false)
    {
        if(e.Item is null||e.Users is null||e.Users.Count==0)return;
        try
        {
            var next=Prepare(e.Item);if(next is null)return;
            foreach(var player in e.Users)
            {
                var user=player.Id.ToString("N");var key=Device(user,e);
                Playing? toSend=null;
                lock(_gate)
                {
                    _active.TryGetValue(key,out var state);
                    // Some Android clients report the old stop AFTER the next start.
                    // A late stop must not replace the next episode's progress.
                    if(isStop&&state is not null&&state.ItemId!=next.ItemId)continue;
                    if(state is null||state.ItemId!=next.ItemId)
                    {
                        // Moving directly to another episode of the *same* series
                        // confirms that the prior episode was watched. Do not count a
                        // brief click/skip as watching.
                        if(state is not null&&!state.Submitted&&next.SeriesId!=Guid.Empty&&
                            next.SeriesId==state.SeriesId&&next.ItemId!=state.ItemId&&
                            DateTimeOffset.UtcNow-state.LastActivity<TimeSpan.FromMinutes(10)&&
                            state.MaxTicks>=TimeSpan.FromMinutes(1).Ticks&&
                            state.RuntimeTicks>0&&state.MaxTicks>=(long)(state.RuntimeTicks*0.05))
                        {state.Submitted=true;toSend=state;}
                        state=next;_active[key]=state;
                    }
                    state.MaxTicks=Math.Max(state.MaxTicks,Position(e));
                    state.LastActivity=DateTimeOffset.UtcNow;
                    if(!state.Submitted&&state.RuntimeTicks>0&&
                        state.MaxTicks>=(long)(Threshold*state.RuntimeTicks))
                    {state.Submitted=true;toSend=state;}
                    // Drop stale devices, but keep the stopped episode briefly to
                    // recognize the immediate next-episode transition.
                    if(_active.Count>250)
                        foreach(var stale in _active.Where(p=>p.Value.LastActivity<DateTimeOffset.UtcNow.AddHours(-3))
                            .Select(p=>p.Key).ToArray())_active.Remove(stale);
                }
                if(toSend is not null)Send(user,toSend);
            }
        }
        catch(Exception ex){_logger.LogWarning(ex,"MisioFlix Simkl: failed to observe playback event");}
    }
    private void Start(object? sender,PlaybackProgressEventArgs e)=>Observe(e,true,false);
    private void Progress(object? sender,PlaybackProgressEventArgs e)=>Observe(e,false,false);
    private void Stop(object? sender,PlaybackStopEventArgs e)=>Observe(e,false,true,e.PlayedToCompletion);
}
