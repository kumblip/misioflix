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
    public MisioFlixSimklController(MisioFlixCatalogService catalog,MisioFlixSimklService simkl)
    {
        _catalog=catalog;_simkl=simkl;
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
        NoCache();try{return Ok(await _simkl.ConnectionAsync(await CurrentUser(cancel),cancel));}
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("connect")]
    public async Task<IActionResult> Connect(CancellationToken cancel)
    {
        NoCache();try{return Ok(await _simkl.StartAsync(await CurrentUser(cancel),cancel));}
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("poll")]
    public async Task<IActionResult> Poll(CancellationToken cancel)
    {
        NoCache();try{return Ok(await _simkl.PollAsync(await CurrentUser(cancel),cancel));}
        catch(Exception ex){return Failure(ex);}
    }
    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect(CancellationToken cancel)
    {
        NoCache();try{await _simkl.DisconnectAsync(await CurrentUser(cancel),cancel);return Ok(new{connected=false});}
        catch(Exception ex){return Failure(ex);}
    }
    [HttpGet("item")]
    public async Task<IActionResult> Item([FromQuery]Guid catalogId,[FromQuery]Guid? seasonId,
        [FromQuery]bool refresh,CancellationToken cancel)
    {
        NoCache();
        try
        {
            var target=await _catalog.AuthorizedSimklTargetAsync(Request,catalogId,seasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return Ok(new{relevant=false});
            // Identity matching is server-side, never trust external IDs sent by the browser.
            var entry=await _simkl.ReadItemAsync(await CurrentUser(cancel),target,refresh,cancel).ConfigureAwait(false);
            return Ok(new{relevant=true,kind=target.Kind,seasonNumber=target.SeasonNumber,
                hasIds=target.Ids.Count>0,connected=entry.Connected,matched=entry.Matched,entry=entry.Entry});
        }
        catch(Exception ex){return Failure(ex);}
    }
    public sealed record EditRequest(Guid CatalogId,Guid? SeasonId,string? Status,int? Score,
        bool ChangeStatus,bool ChangeScore);
    [HttpPost("update")]
    public async Task<IActionResult> Update([FromBody]EditRequest input,CancellationToken cancel)
    {
        NoCache();
        try
        {
            var target=await _catalog.AuthorizedSimklTargetAsync(Request,input.CatalogId,input.SeasonId,cancel).ConfigureAwait(false);
            if(!target.Relevant)return BadRequest(new{error="Simkl nie jest dostępny w AnimePL"});
            await _simkl.UpdateAsync(await CurrentUser(cancel),target,
                new MisioFlixSimklService.SimklEdit(input.Status,input.Score,input.ChangeStatus,input.ChangeScore),cancel)
                .ConfigureAwait(false);
            return Ok(new{saved=true});
        }
        catch(Exception ex){return Failure(ex);}
    }
}
