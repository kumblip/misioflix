using System;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MisioFlix.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

// Read-only discovery. Package installation and scheduled task start use
// Jellyfin's native ADMIN-PROTECTED /Packages and /ScheduledTasks API.
[ApiController]
[Route("MisioFlix/api/updates")]
[Authorize]
public sealed class MisioFlixUpdateController : ControllerBase
{
    private readonly MisioFlixUpdateService _updates;
    public MisioFlixUpdateController(MisioFlixUpdateService updates) => _updates = updates;

    [HttpGet("status")]
    public async Task<IActionResult> Status([FromQuery] bool force=false, CancellationToken cancel=default)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        Response.Headers.CacheControl = "private, no-store";
        try { return Ok(await _updates.StatusAsync(force, cancel).ConfigureAwait(false)); }
        catch (OperationCanceledException) when (cancel.IsCancellationRequested) { return StatusCode(StatusCodes.Status503ServiceUnavailable); }
    }
}
