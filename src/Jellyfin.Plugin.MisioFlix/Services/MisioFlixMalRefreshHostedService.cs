using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>
/// Proactively renews each user's MAL credentials while Jellyfin is running, regardless
/// of whether any browser, Tailscale device, or Jellyfin user is connected.
/// </summary>
public sealed class MisioFlixMalRefreshHostedService : BackgroundService
{
    private static readonly TimeSpan Interval = TimeSpan.FromHours(12);
    private readonly MisioFlixMalService _mal;
    private readonly ILogger<MisioFlixMalRefreshHostedService> _logger;

    public MisioFlixMalRefreshHostedService(MisioFlixMalService mal,
        ILogger<MisioFlixMalRefreshHostedService> logger)
    {
        _mal = mal;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // Immediate pass on Jellyfin startup, then every twelve hours. The first pass
        // only contacts MAL for accounts expiring within seven days.
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var result = await _mal.RefreshInactiveAccountsAsync(stoppingToken).ConfigureAwait(false);
                if (result.Renewed != 0 || result.Failed != 0)
                    _logger.LogInformation("MisioFlix MAL refresh: {Renewed} renewed, {Failed} failed, {Linked} linked users",
                        result.Renewed, result.Failed, result.Linked);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                // Do not log exception messages: remote services may include sensitive data.
                _logger.LogWarning("MisioFlix MAL background refresh cycle failed ({ExceptionType})",
                    ex.GetType().Name);
            }
            try { await Task.Delay(Interval, stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }
}
