using System;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MisioFlix.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

/// <summary>Isolated, authorized Simkl API; no MAL or Jellyfin playback writes.</summary>
[ApiController]
[Authorize]
[Route("MisioFlix/api/simkl")]
public sealed class MisioFlixSimklController : ControllerBase
{
    private readonly MisioFlixCatalogService _catalog;
    private readonly MisioFlixSimklService _simkl;
    private readonly MisioFlixSimklLocalStore _local;
    public MisioFlixSimklController(MisioFlixCatalogService catalog,MisioFlixSimklService simkl,
        MisioFlixSimklLocalStore local)
    {
        _catalog=catalog;_simkl=simkl;_local=local;
    }
    private void NoCache()=>Response.Headers.CacheControl="private, no-store";
    private async Task<string> CurrentUser(CancellationToken cancel)=>
        await _catalog.GetAuthenticatedUserIdAsync(Request,cancel).ConfigureAwait(false);
    private IActionResult Failure(Exception error)=>error switch
    {
        UnauthorizedAccessException=>Unauthorized(new{error="Brak uprawnień do tej pozycji"}),
        ArgumentException=>BadRequest(new{error=error.Message}),
        InvalidOperationException=>BadRequest(new{error=error.Message}),
        HttpRequestException=>StatusCode(502,new{error=error.Message}),
        _=>StatusCode(500,new{error="Błąd modułu Simkl"})
    };
    [HttpGet("connection")]
    public async Task<IActionResult> Connection(CancellationToken cancel)
    {
        NoCache();try
        {
            var state=await _simkl.ConnectionAsync(await CurrentUser(cancel),cancel);
            // Jellyfin uses a PascalCase JSON profile by default. Always expose an
            // explicit lower-camel-case API contract to the independent Simkl UI.
            return Ok(new { connected=state.Connected, canWrite=state.CanWrite });
        }
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("connect")]
    public async Task<IActionResult> Connect(CancellationToken cancel)
    {
        NoCache();try
        {
            var pin=await _simkl.StartAsync(await CurrentUser(cancel),cancel);
            return Ok(new { code=pin.Code, uri=pin.Uri, expiresIn=pin.ExpiresIn, interval=pin.Interval });
        }
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("poll")]
    public async Task<IActionResult> Poll(CancellationToken cancel)
    {
        NoCache();try
        {
            var result=await _simkl.PollAsync(await CurrentUser(cancel),cancel);
            return Ok(new { connected=result.Connected, pending=result.Pending, retryAfter=result.RetryAfter });
        }
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect(CancellationToken cancel)
    {
        NoCache();try{await _simkl.DisconnectAsync(await CurrentUser(cancel),cancel);return Ok(new{connected=false});}
        catch(Exception ex){return Failure(ex);}
    }
    [HttpGet("item")]
    public async Task<IActionResult> Item([FromQuery]Guid catalogId,[FromQuery]Guid? seasonId,[FromQuery]Guid? episodeId,
        [FromQuery]bool refresh,CancellationToken cancel)
    {
        NoCache();
        try
        {
            if(episodeId.HasValue && !seasonId.HasValue)
                return BadRequest(new{error="Odcinek musi mieć wskazany sezon."});
            var episode=episodeId.HasValue
                ? await _catalog.AuthorizedSimklEpisodeAsync(Request,catalogId,seasonId!.Value,episodeId.Value,cancel).ConfigureAwait(false)
                : ((SimklMediaTarget Target,int EpisodeNumber)?)null;
            var target=episode?.Target ?? await _catalog.AuthorizedSimklTargetAsync(Request,catalogId,seasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return Ok(new{relevant=false});
            // Identity matching is server-side, never trust external IDs sent by the browser.
            var user=await CurrentUser(cancel);
            var entry=await _simkl.ReadItemAsync(user,target,refresh,cancel).ConfigureAwait(false);
            var rewatches=episode.HasValue?(int?)null:
                await _local.GetRewatchAsync(user,catalogId,seasonId,cancel).ConfigureAwait(false);
            // The nested SimklEntry record also needs explicit lower-case JSON
            // field names (Score/Status/WatchedEpisodes were invisible in the UI).
            var item=entry.Entry is null ? null : new {
                kind=entry.Entry.Kind,
                id=entry.Entry.Id,
                status=entry.Entry.Status,
                score=entry.Entry.Score,
                watchedEpisodes=entry.Entry.WatchedEpisodes,
                totalEpisodes=entry.Entry.TotalEpisodes,
                ids=entry.Entry.Ids,
                title=entry.Entry.Title,
                slug=entry.Entry.Slug
            };
            var seasonEpisodes=target.SeasonNumber.HasValue
                ? await _catalog.AuthorizedSimklSeasonEpisodeNumbersAsync(Request,seasonId!.Value,cancel).ConfigureAwait(false)
                : null;
            var watched=target.SeasonNumber.HasValue && entry.Entry?.WatchedSeasons is not null &&
                entry.Entry.WatchedSeasons.TryGetValue(target.SeasonNumber.Value,out var seen)
                ? seen : new System.Collections.Generic.List<int>();
            return Ok(new{relevant=true,kind=target.Kind,seasonNumber=target.SeasonNumber,
                episodeNumbers=episode.HasValue?null:seasonEpisodes,
                episodeNumber=episode?.EpisodeNumber,
                episodeWatched=episode.HasValue?watched.Contains(episode.Value.EpisodeNumber):(bool?)null,
                watchedEpisodeNumbers=target.SeasonNumber.HasValue?watched:null,
                hasIds=target.Ids.Count>0,connected=entry.Connected,matched=entry.Matched,
                localBackup=entry.LocalBackup,rewatches,entry=item});
        }
        catch(Exception ex){return Failure(ex);}
    }
    public sealed record EpisodeHistoryRequest(Guid CatalogId,Guid SeasonId,Guid EpisodeId,bool Watched);
    [HttpPost("episode-history")]
    public async Task<IActionResult> UpdateEpisodeHistory([FromBody]EpisodeHistoryRequest input,CancellationToken cancel)
    {
        NoCache();try
        {
            var (target,episodeNumber)=await _catalog.AuthorizedSimklEpisodeAsync(
                Request,input.CatalogId,input.SeasonId,input.EpisodeId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return BadRequest(new{error="Simkl nie jest dostępny w AnimePL"});
            // Explicitly scope the write to ONE validated episode, never the whole season.
            await _simkl.UpdateSeasonAsync(await CurrentUser(cancel),target,
                new MisioFlixSimklService.SimklSeasonEdit(input.Watched,new[]{episodeNumber}),
                new[]{episodeNumber},cancel).ConfigureAwait(false);
            return Ok(new{saved=true});
        }
        catch(Exception ex){return Failure(ex);}
    }
    public sealed record SeasonHistoryRequest(Guid CatalogId,Guid SeasonId,bool Watched,
        System.Collections.Generic.List<int>? EpisodeNumbers);
    [HttpPost("season-history")]
    public async Task<IActionResult> UpdateSeasonHistory([FromBody]SeasonHistoryRequest input,CancellationToken cancel)
    {
        NoCache();
        try
        {
            if(input.SeasonId==Guid.Empty)return BadRequest(new{error="Wybierz sezon."});
            var target=await _catalog.AuthorizedSimklTargetAsync(Request,input.CatalogId,input.SeasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return BadRequest(new{error="Simkl nie jest dostępny w AnimePL"});
            var allowed=await _catalog.AuthorizedSimklSeasonEpisodeNumbersAsync(Request,input.SeasonId,cancel).ConfigureAwait(false);
            await _simkl.UpdateSeasonAsync(await CurrentUser(cancel),target,
                new MisioFlixSimklService.SimklSeasonEdit(input.Watched,input.EpisodeNumbers),allowed,cancel)
                .ConfigureAwait(false);
            return Ok(new{saved=true});
        }
        catch(Exception ex){return Failure(ex);}
    }
    public sealed record EditRequest(Guid CatalogId,Guid? SeasonId,string? Status,int? Score,
        bool ChangeStatus,bool ChangeScore,bool CreateIfMissing=false);
    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody]EditRequest input,CancellationToken cancel)
    {
        NoCache();
        try
        {
            var target=await _catalog.AuthorizedSimklTargetAsync(Request,input.CatalogId,input.SeasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return BadRequest(new{error="Simkl nie jest dostępny w AnimePL"});
            if(input.SeasonId.HasValue)return BadRequest(new{error="Edycja statusu i oceny serialu jest dostępna tylko na stronie serialu."});
            await _simkl.UpdateAsync(await CurrentUser(cancel),target,
                new MisioFlixSimklService.SimklEdit(input.Status,input.Score,input.ChangeStatus,input.ChangeScore,input.CreateIfMissing),cancel)
                .ConfigureAwait(false);
            return Ok(new{saved=true});
        }
        catch(Exception ex){return Failure(ex);}
    }    [HttpGet("sync-check")]
    public async Task<IActionResult> SyncCheck(CancellationToken cancel)
    {
        NoCache();try
        {
            var checkedOk=await _simkl.SyncIfDueAsync(await CurrentUser(cancel),cancel).ConfigureAwait(false);
            return Ok(new{checkedOk});
        }
        catch(Exception ex){return Failure(ex);}
    }
    public sealed record RewatchEditRequest(Guid CatalogId,Guid? SeasonId,int Count);
    [HttpPost("rewatch")]
    public async Task<IActionResult> Rewatch([FromBody]RewatchEditRequest input,CancellationToken cancel)
    {
        NoCache();try
        {
            var target=await _catalog.AuthorizedSimklTargetAsync(Request,input.CatalogId,input.SeasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return BadRequest(new{error="Simkl nie jest dostępny w AnimePL"});
            if(input.Count is <0 or >100000)return BadRequest(new{error="Nieprawidłowy licznik ponownych obejrzeń"});
            var count=await _local.SetRewatchAsync(await CurrentUser(cancel),input.CatalogId,input.SeasonId,input.Count,cancel);
            return Ok(new{saved=true,rewatches=count,localOnly=true});
        }
        catch(Exception ex){return Failure(ex);}
    }
    [HttpGet("export")]
    public async Task<IActionResult> Export(CancellationToken cancel)
    {
        NoCache();try
        {
            var user=await CurrentUser(cancel);
            var data=await _local.ExportAsync(user,cancel).ConfigureAwait(false);
            return File(data,"application/json","MisioFlix_Simkl_Backup_"+DateTime.UtcNow.ToString("yyyyMMdd")+".json");
        }
        catch(Exception ex){return Failure(ex);}
    }

}
