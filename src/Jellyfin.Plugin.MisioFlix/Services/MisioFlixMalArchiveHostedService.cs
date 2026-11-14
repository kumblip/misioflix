using System;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Jellyfin.Plugin.MisioFlix.Services;

/// <summary>Nonblocking 72h archive scheduler; also checks overdue backups after NAS restarts.</summary>
public sealed class MisioFlixMalArchiveHostedService : BackgroundService
{
    private readonly MisioFlixMalService _mal;
    private readonly MisioFlixMalArchiveService _archive;
    private readonly ILogger<MisioFlixMalArchiveHostedService> _logger;

    public MisioFlixMalArchiveHostedService(MisioFlixMalService mal,
        MisioFlixMalArchiveService archive, ILogger<MisioFlixMalArchiveHostedService> logger)
    {
        _mal = mal;
        _archive = archive;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                foreach (var user in _mal.LinkedUsers())
                {
                    stoppingToken.ThrowIfCancellationRequested();
                    _archive.CheckDue(user);
                }
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
            catch (Exception ex)
            {
                _logger.LogWarning("MisioFlix MAL archive scheduler failed ({ErrorType})", ex.GetType().Name);
            }
            try { await Task.Delay(TimeSpan.FromMinutes(15), stoppingToken).ConfigureAwait(false); }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested) { break; }
        }
    }
}
