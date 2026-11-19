using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Channels;
using System.Threading;
using System.Threading.Tasks;
using MediaBrowser.Controller.Entities;
using MediaBrowser.Controller.Entities.Movies;
using MediaBrowser.Controller.Entities.TV;
using MediaBrowser.Controller.Library;
using MediaBrowser.Controller.Session;
using MediaBrowser.Model.Entities;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Jellyfin server playback events: works for web, Android and native clients.
/// Threshold is >=80%, or the viewer's intentional consecutive-episode
/// transition after playback actually advances (even by a few seconds).
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
    private readonly IUserDataManager _userData;
    private readonly ILibraryManager _library;
    private readonly MisioFlixSimklService _simkl;
    private readonly ILogger<MisioFlixSimklPlaybackHostedService> _logger;
    private readonly object _gate=new();
    private readonly Dictionary<string,Playing> _active=new(StringComparer.Ordinal);
    private const double Threshold=0.80;
    // Jellyfin's native watched checkbox uses UserDataSaveReason.TogglePlayed.
    // Keep these operations in the order received: an immediate uncheck must
    // not be reordered ahead of a previous check by Task.Run scheduling.
    private sealed record ManualWatch(string User,SimklMediaTarget Target,int? Episode,bool Watched);
    private readonly Channel<ManualWatch> _manualQueue=Channel.CreateUnbounded<ManualWatch>(
        new UnboundedChannelOptions {SingleReader=true,SingleWriter=false});
    private Task? _manualWorker;
    // For episode transitions, do not infer "watched" from arbitrary episode
    // changes in the same series, such as S01E02 -> S01E15.
    private static bool IsFollowingEpisode(Playing previous,Playing next)=>
        previous.SeriesId!=Guid.Empty&&previous.SeriesId==next.SeriesId&&
        (next.Season==previous.Season&&next.Episode==previous.Episode+1 ||
         next.Season==previous.Season+1&&next.Episode==1);

    public MisioFlixSimklPlaybackHostedService(ISessionManager sessions,IUserDataManager userData,
        ILibraryManager library,MisioFlixSimklService simkl,
        ILogger<MisioFlixSimklPlaybackHostedService> logger)
    { _sessions=sessions;_userData=userData;_library=library;_simkl=simkl;_logger=logger; }

    public Task StartAsync(CancellationToken cancellationToken)
    {
        _sessions.PlaybackStart+=Start;
        _sessions.PlaybackProgress+=Progress;
        _sessions.PlaybackStopped+=Stop;
        _userData.UserDataSaved+=OnUserDataSaved;
        _manualWorker=Task.Run(DrainManualChangesAsync);
        return Task.CompletedTask;
    }
    public async Task StopAsync(CancellationToken cancellationToken)
    {
        _sessions.PlaybackStart-=Start;
        _sessions.PlaybackProgress-=Progress;
        _sessions.PlaybackStopped-=Stop;
        _userData.UserDataSaved-=OnUserDataSaved;
        _manualQueue.Writer.TryComplete();
        if(_manualWorker is not null)
        {
            try {await _manualWorker.WaitAsync(cancellationToken).ConfigureAwait(false);}
            catch(OperationCanceledException)
            {_logger.LogWarning("MisioFlix Simkl: stop interrupted while draining native Jellyfin watched changes");}
        }
        lock(_gate)_active.Clear();
    }
    private void OnUserDataSaved(object? sender,UserDataSaveEventArgs e)
    {
        // Ignore playback-generated saves: they have their own 80% and Next Up rules.
        // Only explicit Jellyfin mark played/unplayed clicks belong here.
        if(e.SaveReason!=UserDataSaveReason.TogglePlayed||e.UserId==Guid.Empty||
            e.Item is null||e.UserData is null)return;
        try
        {
            var media=Prepare(e.Item,requireRuntime:false);
            if(media is null)return; // no AnimePL, unsupported media or missing IDs
            _manualQueue.Writer.TryWrite(new ManualWatch(e.UserId.ToString("N"),
                media.Target,media.Target.Kind=="shows"?media.Episode:null,e.UserData.Played));
        }
        catch(Exception ex){_logger.LogWarning(ex,"MisioFlix Simkl: cannot queue Jellyfin manual watched toggle");}
    }
    private async Task DrainManualChangesAsync()
    {
        await foreach(var change in _manualQueue.Reader.ReadAllAsync().ConfigureAwait(false))
        {
            try
            {
                await _simkl.RecordJellyfinToggleAsync(change.User,change.Target,
                    change.Episode,change.Watched,CancellationToken.None).ConfigureAwait(false);
            }
            catch(Exception ex)
            {
                _logger.LogWarning(ex,"MisioFlix Simkl: native watched toggle failed for Jellyfin user {User}",change.User);
            }
        }
    }
    private static string Device(string user,PlaybackProgressEventArgs e)=>user+":"+
        (!string.IsNullOrWhiteSpace(e.DeviceId)?e.DeviceId:e.Session?.Id??"unknown");
    private static long Position(PlaybackProgressEventArgs e)=>Math.Max(0,e.PlaybackPositionTicks??0);

    private bool IsAnime(BaseItem item,BaseItem mediaRoot)
    {
        // No Simkl playback / watched-toggle writes for NFO-tagged anime,
        // including anime outside AnimeRoot. The series-level tag applies to
        // every episode; movies use their own movie.nfo/Jellyfin tags.
        return MisioFlixCatalogService.IsSimklAnime(mediaRoot,
                   mediaRoot is Movie ? "Movie" : "Series") ||
               MisioFlixCatalogService.IsSimklAnime(item,
                   item is Movie ? "Movie" : "Season");
    }
    private Playing? Prepare(BaseItem item,bool requireRuntime=true)
    {
        var runtimeTicks=item.RunTimeTicks.GetValueOrDefault();
        if(requireRuntime&&runtimeTicks<=0)return null;
        BaseItem root;
        Guid seriesId=Guid.Empty;int season=0,episodeNumber=0;
        if(item is Episode ep)
        {
            var seasonIndex=ep.ParentIndexNumber.GetValueOrDefault(-1);
            var episodeIndex=ep.IndexNumber.GetValueOrDefault();
            if(episodeIndex<1||!ep.ParentIndexNumber.HasValue||seasonIndex<0)return null;
            seriesId=ep.SeriesId;
            if(seriesId==Guid.Empty)return null;
            var seriesRoot=_library.GetItemById(seriesId);
            if(seriesRoot is not Series)return null;
            root=seriesRoot;
            season=seasonIndex;episodeNumber=episodeIndex;
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
            RuntimeTicks=runtimeTicks,Target=target};
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
                        // "Next episode" is a deliberate action. A few seconds of
                        // genuine playback suffice; do not require 5% or one minute.
                        // Do not complete an arbitrary jump to a distant episode.
                        if(state is not null&&!state.Submitted&&!isStop&&
                            IsFollowingEpisode(state,next)&&state.ItemId!=next.ItemId&&
                            DateTimeOffset.UtcNow-state.LastActivity<TimeSpan.FromMinutes(10)&&
                            state.MaxTicks>0)
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
