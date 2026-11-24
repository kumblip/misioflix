using Jellyfin.Plugin.MisioFlix.Services;
using MediaBrowser.Common.Api;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Jellyfin.Plugin.MisioFlix.Controllers;

[ApiController]
[Route("MisioFlix/api/diagnostics")]
[Authorize(Policy = Policies.RequiresElevation)]
public sealed class MisioFlixDiagnosticsController : ControllerBase
{
    [HttpGet]
    public IActionResult Read() { Response.Headers.CacheControl = "private, no-store"; return Ok(MisioFlixDiagnostics.Snapshot()); }
    [HttpPost("enable")]
    public IActionResult Enable([FromQuery] bool enabled)
    {
        MisioFlixDiagnostics.SetEnabled(enabled);
        return Read();
    }
    [HttpPost("reset")]
    public IActionResult Reset() { MisioFlixDiagnostics.Reset(); return Read(); }
}
