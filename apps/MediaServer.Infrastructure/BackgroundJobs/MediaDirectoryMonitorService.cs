using MediaServer.Application.Media.Commands;
using MediaServer.Application.Models;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MediaServer.Infrastructure.BackgroundJobs;

public class MediaDirectoryMonitorService : BackgroundService
{
    public MediaDirectoryMonitorService(ILogger<MediaDirectoryMonitorService> logger, IServiceScopeFactory scopeFactory, IOptions<AppSettings> appSettings)
    {
        _logger = logger;
        _scopeFactory = scopeFactory;
        _scannerSettings = appSettings.Value.ScannerSettings;
    }

    private readonly ILogger<MediaDirectoryMonitorService> _logger;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ScannerSettings _scannerSettings;
    private readonly List<FileSystemWatcher> _watchers = new();
    
    protected override Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Starting Real-Time Directory Monitors...");

        foreach (var path in _scannerSettings.LibraryPaths)
        {
            if (!Directory.Exists(path))
            {
                _logger.LogWarning("Monitor cannot start for missing directory: {Path}", path);
                continue;
            }

            var watcher = new FileSystemWatcher(path)
            {
                NotifyFilter = NotifyFilters.FileName | NotifyFilters.CreationTime,
                IncludeSubdirectories = true,
                EnableRaisingEvents = true
            };

            watcher.Created += (sender, e) => _ = OnFileCreatedAsync(e.FullPath, stoppingToken);
            
            _watchers.Add(watcher);
            _logger.LogInformation("Actively monitoring: {Path}", path);
        }

        return Task.CompletedTask;
    }

    private async Task OnFileCreatedAsync(string fullPath, CancellationToken cancellationToken)
    {
        try
        {
            var extension = Path.GetExtension(fullPath).ToLowerInvariant();
            if (!_scannerSettings.SupportedExtensions.Contains(extension))
            {
                return;
            }
            
            _logger.LogInformation("New file detected, waiting for copy to complete: {FileName}", Path.GetFileName(fullPath));
            
            await WaitForFileUnlockAsync(fullPath, cancellationToken);
            
            _logger.LogInformation("File unlocked. Dispatching ingestion for: {FileName}", Path.GetFileName(fullPath));
            
            using var scope = _scopeFactory.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            var command = new IngestMediaCommand
            {
                FilePath = fullPath,
                Title = Path.GetFileNameWithoutExtension(fullPath)
            };
            var result = await mediator.Send(command, cancellationToken);

            if (!result.IsSuccess)
            {
                _logger.LogError("Event-driven ingestion failed for {File}. Reason: {Error}", fullPath, result.Exception);
            }
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error processing newly created file: {Path}", fullPath);
        }
    }

    private async Task WaitForFileUnlockAsync(string filePath, CancellationToken cancellationToken)
    {
        const int maxRetries = 200;
        const int delayMilliseconds = 5000;
        long lastSize = -1;

        for (int i = 0; i < maxRetries; i++)
        {
            cancellationToken.ThrowIfCancellationRequested();

            long currentSize = GetFileSize(filePath);
            if (currentSize > 0 && currentSize == lastSize && TryAcquireExclusiveLock(filePath))
            {
                _logger.LogInformation("File size stabilized at {Size} bytes.", currentSize);
                await Task.Delay(500, cancellationToken); 
                return;
            }

            lastSize = currentSize;
            await Task.Delay(delayMilliseconds, cancellationToken);
        }

        throw new TimeoutException($"Timed out waiting for file to finish copying: {filePath}");
    }

    private long GetFileSize(string filePath)
    {
        try
        {
            var fileInfo = new FileInfo(filePath);
            return fileInfo.Exists ? fileInfo.Length : 0;
        }
        catch (Exception)
        {
            return 0;
        }
    }

    private bool TryAcquireExclusiveLock(string filePath)
    {
        try
        {
            using var stream = File.Open(filePath, FileMode.Open, FileAccess.Read, FileShare.None);
            return true;
        }
        catch (IOException)
        {
            return false;
        }
    }

    public override void Dispose()
    {
        foreach (var watcher in _watchers)
        {
            watcher.Dispose();
        }
        
        base.Dispose();
    }
}