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

    public MisioFlixController(MisioFlixCatalogService catalog)
    {
        _catalog = catalog;
    }

    [HttpGet("api/health")]
    public IActionResult Health() => Ok(new { plugin = "MisioFlix", version = "0.4.2", enabled = Plugin.Instance?.Configuration.Enabled ?? false });

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

    [HttpGet("api/item/{id:guid}")]
    [Authorize]
    public async Task<IActionResult> Item(Guid id, CancellationToken cancellationToken)
    {
        if (Plugin.Instance?.Configuration.Enabled != true) return NotFound();
        try
        {
            var catalog = await _catalog.ReadForAuthenticatedUserAsync(Request, cancellationToken).ConfigureAwait(false);
            var item = catalog.items.Find(x => x.id.Equals(id.ToString(), StringComparison.OrdinalIgnoreCase));
            return item is null ? NotFound() : Ok(new { item, episodes = Array.Empty<object>() });
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
