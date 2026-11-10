using System.Collections.Generic;
using System;
using System.IO;
using System.Reflection;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MisioFlix.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

[ApiController]
[Route("MisioFlix")]
public sealed class MisioFlixController : ControllerBase
{
    private readonly MisioFlixCatalogService _catalog;
    private readonly MisioFlixMalService _mal;

    public MisioFlixController(MisioFlixCatalogService catalog,MisioFlixMalService mal)
    {
        _catalog = catalog;
        _mal = mal;
    }

    [HttpGet("api/health")]
    public IActionResult Health() => Ok(new { plugin = "MisioFlix", version = "0.4.5", enabled = Plugin.Instance?.Configuration.Enabled ?? false });

    [HttpGet("assets/{filename}")]
    [AllowAnonymous]
    public IActionResult Asset(string filename)
    {
        // No arbitrary path segments; all files are embedded in the DLL.
        var (resource, contentType) = filename switch
        {
            "client.js" => ("Web.client.js", "text/javascript; charset=utf-8"),
            "theme.css" => ("Web.theme.css", "text/css; charset=utf-8"),
            "logo.png" => ("Web.assets.logo.png", "image/png"),
            "mark.png" => ("Web.assets.mark.png", "image/png"),
            "background.png" => ("Web.assets.background.png", "image/png"),
            _ => (null, null)
        };
        if (resource is null || contentType is null) return NotFound();
        var assembly = typeof(Plugin).Assembly;
        using var stream = assembly.GetManifestResourceStream("Jellyfin.Plugin.MisioFlix." + resource);
        if (stream is null) return NotFound();
        using var memory = new MemoryStream();
        stream.CopyTo(memory);
        Response.Headers.CacheControl = "public, max-age=3600";
        return File(memory.ToArray(), contentType);
    }

    [HttpGet("api/catalog")]
    [Authorize]
    public async Task<IActionResult> Catalog(CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        try
        {
            return Ok(await _catalog.ReadForAuthenticatedUserAsync(Request, cancellationToken).ConfigureAwait(false));
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "Nie można połączyć się z lokalnym API Jellyfin." });
        }
    }

    [HttpGet("api/resume")]
    [Authorize]
    public async Task<IActionResult> Resume(CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        try
        {
            return Ok(await _catalog.ReadResumeForAuthenticatedUserAsync(Request, cancellationToken).ConfigureAwait(false));
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "Nie można pobrać postępu oglądania z Jellyfin." });
        }
    }

    // No modification of Jellyfin UserData: dismiss/restore controls only MisioFlix presentation.
    public sealed record ResumeVisibilityRequest(Guid CatalogId);

    [HttpPost("api/resume/hide")]
    [Authorize]
    public async Task<IActionResult> HideResume([FromBody] ResumeVisibilityRequest request, CancellationToken cancellationToken)
        => await SetResumeVisibility(request.CatalogId, true, cancellationToken).ConfigureAwait(false);

    [HttpPost("api/resume/restore")]
    [Authorize]
    public async Task<IActionResult> RestoreResume([FromBody] ResumeVisibilityRequest request, CancellationToken cancellationToken)
        => await SetResumeVisibility(request.CatalogId, false, cancellationToken).ConfigureAwait(false);

    private async Task<IActionResult> SetResumeVisibility(Guid catalogId, bool hide, CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        if (catalogId == Guid.Empty) return BadRequest();
        try
        {
            await _catalog.HideResumeForAuthenticatedUserAsync(Request, catalogId, hide, cancellationToken).ConfigureAwait(false);
            return Ok(new { success = true });
        }
        catch (UnauthorizedAccessException) { return Forbid(); }
        catch (HttpRequestException) { return StatusCode(502); }
    }

    // Numeric personal rating — Jellyfin UserData.Rating, NOT CommunityRating.
    public sealed record RatingRequest(double? Rating,Guid? SeasonId);
    [HttpPost("api/item/{id:guid}/rating")]
    [Authorize]
    public async Task<IActionResult> Rating(Guid id,[FromBody] RatingRequest request,CancellationToken cancel)
    {
        if(Plugin.Instance?.Configuration.Enabled != true)return NotFound();
        try
        {
            var value=request.SeasonId.HasValue
                ? await _catalog.SetSeasonRatingAsync(Request,id,request.SeasonId.Value,request.Rating,cancel).ConfigureAwait(false)
                : await _catalog.SetPersonalRatingAsync(Request,id,request.Rating,cancel).ConfigureAwait(false);
            return Ok(new {rating=value});
        }
        catch(UnauthorizedAccessException){return Forbid();}
        catch(ArgumentOutOfRangeException){return BadRequest(new {error="Ocena 1–10 (co 0,5)"});}
        catch(HttpRequestException){return StatusCode(502,new{error="Nie udało się zapisać oceny w Jellyfin"});}
    }

    [HttpGet("api/mal/status")]
    [Authorize]
    public async Task<IActionResult> MalStatus([FromQuery] bool refresh,CancellationToken cancel)
    {
        try
        {
            var user=await _catalog.GetAuthenticatedUserIdAsync(Request,cancel).ConfigureAwait(false);
            var connection=await _mal.GetConnectionAsync(user,cancel,refreshProfile:refresh).ConfigureAwait(false);
            if(!connection.Connected)return Ok(new {connected=false,malUserId=(int?)null,username=(string?)null,entries=new Dictionary<int,MalEntry>()});
            var entries=await _mal.ReadAllAsync(user,refresh,cancel).ConfigureAwait(false);
            return Ok(new{connected=true,malUserId=connection.MalUserId,username=connection.Username,entries});
        }
        catch(UnauthorizedAccessException){return Unauthorized();}
        catch(HttpRequestException){return StatusCode(502,new{error="Nie można pobrać listy MAL"});}
        catch(InvalidOperationException e){return BadRequest(new{error=e.Message});}
    }

    [HttpGet("api/mal/connect")]
    [Authorize]
    public async Task<IActionResult> MalConnect(CancellationToken cancel)
    {
        try
        {
            var user=await _catalog.GetAuthenticatedUserIdAsync(Request,cancel).ConfigureAwait(false);
            var link=_mal.Start(user);
            return Ok(new{url=link.url,message=link.message,manual=link.manual});
        }
        catch(InvalidOperationException e){return BadRequest(new{error=e.Message});}
        catch(UnauthorizedAccessException){return Unauthorized();}
    }

    // Manual OAuth is accepted only from the authenticated user who initiated the PKCE
    // session, never anonymously. The one-time code is submitted in the JSON POST body.
    public sealed record MalCompleteRequest(string RedirectUrl);
    [HttpPost("api/mal/complete")]
    [Authorize]
    public async Task<IActionResult> MalComplete([FromBody] MalCompleteRequest input, CancellationToken cancel)
    {
        try
        {
            var user = await _catalog.GetAuthenticatedUserIdAsync(Request, cancel).ConfigureAwait(false);
            await _mal.FinishManualAsync(user, input.RedirectUrl ?? "", cancel).ConfigureAwait(false);
            return Ok(new { connected = true });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
        catch (ArgumentException e) { return BadRequest(new { error = e.Message }); }
        catch (InvalidOperationException e) { return BadRequest(new { error = e.Message }); }
        catch (HttpRequestException) { return StatusCode(502, new { error = "MAL nie zaakceptował kodu. Rozpocznij nowe logowanie." }); }
    }

    // OAuth callback receives a state-bound one-time code; NEVER an access token in the URL.
    [HttpGet("api/mal/callback")]
    [AllowAnonymous]
    public async Task<IActionResult> MalCallback([FromQuery] string? code,[FromQuery] string? state,CancellationToken cancel)
    {
        try
        {
            await _mal.FinishAsync(code??"",state??"",cancel).ConfigureAwait(false);
            return Content("<!doctype html><html lang=pl><meta charset=utf-8><title>MisioFlix MAL</title>"+
                "<body style='background:#201320;color:#ffe5f1;font:18px system-ui;padding:3rem'>"+
                "MyAnimeList połączone. Zamknij to okno, wróć do MisioFlix i wybierz Odśwież MAL.</body></html>","text/html");
        }
        catch(Exception e) when(e is InvalidOperationException or UnauthorizedAccessException or HttpRequestException or ArgumentException)
        {
            // Do not echo external OAuth details or user credentials in a public callback.
            return BadRequest("Nie udało się połączyć MyAnimeList. Wróć do MisioFlix i ponów połączenie.");
        }
    }

    [HttpPost("api/mal/disconnect")]
    [Authorize]
    public async Task<IActionResult> MalDisconnect(CancellationToken cancel)
    {
        try
        {
            var user=await _catalog.GetAuthenticatedUserIdAsync(Request,cancel).ConfigureAwait(false);
            await _mal.DisconnectAsync(user,cancel).ConfigureAwait(false);
            return Ok(new{connected=false});
        }
        catch(UnauthorizedAccessException){return Unauthorized();}
    }

    public sealed record MalEditRequest(Guid CatalogId,Guid? SeasonId,string? Status,int? Score,
        int? EpisodesWatched,int? TimesRewatched);
    [HttpPost("api/mal/update")]
    [Authorize]
    public async Task<IActionResult> MalUpdate([FromBody] MalEditRequest input,CancellationToken cancel)
    {
        try
        {
            var malId=await _catalog.AuthorizedMalIdAsync(Request,input.CatalogId,input.SeasonId,cancel).ConfigureAwait(false);
            var user=await _catalog.GetAuthenticatedUserIdAsync(Request,cancel).ConfigureAwait(false);
            var entry=await _mal.UpdateAsync(user,malId,
                new MalUpdate(input.Status,input.Score,input.EpisodesWatched,input.TimesRewatched),cancel)
                .ConfigureAwait(false);
            return Ok(entry);
        }
        catch(UnauthorizedAccessException){return Forbid();}
        catch(ArgumentException e){return BadRequest(new{error=e.Message});}
        catch(InvalidOperationException e){return BadRequest(new{error=e.Message});}
        catch(HttpRequestException){return StatusCode(502,new{error="MAL nie zapisał zmian"});}
    }

    [HttpGet("api/item/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Item(Guid id, CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        try
        {
            var catalog = await _catalog.ReadForAuthenticatedUserAsync(Request, cancellationToken).ConfigureAwait(false);
            var item = catalog.items.Find(x => x.id.Equals(id.ToString(), StringComparison.OrdinalIgnoreCase));
            if(item is null)return NotFound();
            var seasons=item.type=="Series"
                ? await _catalog.ReadSeasonsAsync(Request,id,cancellationToken).ConfigureAwait(false)
                : new System.Collections.Generic.List<SeasonInfo>();
            return Ok(new { item, seasons, episodes = Array.Empty<object>() });
        }
        catch (UnauthorizedAccessException)
        {
            return Unauthorized();
        }
        catch (HttpRequestException)
        {
            return StatusCode(502, new { error = "Nie można połączyć się z lokalnym API Jellyfin." });
        }
    }
}
