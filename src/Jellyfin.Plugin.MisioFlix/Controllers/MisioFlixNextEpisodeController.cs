using System;
using System.Threading;
using System.Threading.Tasks;
using Jellyfin.Plugin.MisioFlix.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

[ApiController]
[Route("MisioFlix/api/playback")]
public sealed class MisioFlixNextEpisodeController : ControllerBase
{
    public sealed record NextEpisodeIntent(string? DeviceId);
    private readonly MisioFlixCatalogService _catalog;
    private readonly MisioFlixNextEpisodeWatchService _watch;

    public MisioFlixNextEpisodeController(MisioFlixCatalogService catalog,
        MisioFlixNextEpisodeWatchService watch)
    { _catalog = catalog; _watch = watch; }

    [Authorize]
    [HttpPost("next-episode-intent")]
    public async Task<IActionResult> NextEpisode([FromBody] NextEpisodeIntent intent,
        CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        Response.Headers.CacheControl = "no-store";
        try
        {
            // Never accept a caller-supplied user ID or episode ID.
            var userId = await _catalog.GetAuthenticatedUserIdAsync(Request, cancellationToken)
                .ConfigureAwait(false);
            if (!Guid.TryParse(userId, out var user)) return Unauthorized();
            return Ok(new { armed = _watch.Arm(user, intent.DeviceId) });
        }
        catch (UnauthorizedAccessException) { return Unauthorized(); }
    }
}
