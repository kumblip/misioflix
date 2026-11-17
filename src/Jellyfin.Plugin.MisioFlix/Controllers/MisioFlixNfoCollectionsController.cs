using System;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MisioFlix.Services;
using MediaBrowser.Common.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

/// <summary>Admin-only reconciliation: changes native Jellyfin BoxSets, never media files.</summary>
[ApiController]
[Route("MisioFlix/api/nfo-collections")]
[Authorize(Policy = Policies.RequiresElevation)]
public sealed class MisioFlixNfoCollectionsController : ControllerBase
{
    private readonly MisioFlixNfoCollectionsService _service;
    public MisioFlixNfoCollectionsController(MisioFlixNfoCollectionsService service) => _service = service;

    [HttpGet("status")]
    public IActionResult Status()
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        Response.Headers.CacheControl = "private, no-store";
        return Ok(_service.Status);
    }

    [HttpPost("sync")]
    public async Task<IActionResult> Sync(CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        Response.Headers.CacheControl = "private, no-store";
        try { return Ok(await _service.SynchronizeAsync(cancellationToken).ConfigureAwait(false)); }
        catch (InvalidOperationException ex) { return Conflict(new { error = ex.Message }); }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested) { return StatusCode(503); }
    }
}
