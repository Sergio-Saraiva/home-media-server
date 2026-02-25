using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Media.Commands;
using MediaServer.Application.Models;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MediaServer.Infrastructure.BackgroundJobs;

public class LibraryScannerService : BackgroundService
{
    public LibraryScannerService(ILogger<LibraryScannerService> logger, IServiceScopeFactory serviceScopeFactory, IOptions<AppSettings> appSettings)
    {
        _logger = logger;
        _serviceScopeFactory = serviceScopeFactory;
        _scannerSettings = appSettings.Value.ScannerSettings;
    }

    private readonly ILogger<LibraryScannerService> _logger;
    private readonly IServiceScopeFactory _serviceScopeFactory;
    private readonly ScannerSettings _scannerSettings;
    
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("LibraryScannerService is starting.");
        
        using var timer = new PeriodicTimer(TimeSpan.FromMinutes(_scannerSettings.ScanIntervalMinutes));
        do
        {
            try
            {
                await ScanLibrariesAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred scanning libraries.");
            }
        } while (await timer.WaitForNextTickAsync(stoppingToken));
    }

    private async Task ScanLibrariesAsync(CancellationToken cancellationToken)
    {
        _logger.LogInformation("Starting library scan across {Count} directories", _scannerSettings.LibraryPaths.Length);
        
        using var scope = _serviceScopeFactory.CreateScope();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
        var repository = scope.ServiceProvider.GetRequiredService<IMediaRepository>();

        foreach (var directoryPath in _scannerSettings.LibraryPaths)
        {
            if (!Directory.Exists(directoryPath))
            {
                _logger.LogWarning("Directory '{Directory}' does not exist. Skipping.", directoryPath);
                continue;
            }
            
            var files = Directory.EnumerateFiles(directoryPath, "*.*", SearchOption.AllDirectories)
                .Where(file => _scannerSettings.SupportedExtensions.Contains(Path.GetExtension(file).ToLowerInvariant()));

            foreach (var filePath in files)
            {
                cancellationToken.ThrowIfCancellationRequested();

                var exists = await repository.ExistsByPathAsync(filePath);
                if (exists)
                {
                    continue;
                }
                
                _logger.LogInformation("New media found! Dispatching IngestMovieCommand for {FilePath}", filePath);

                var command = new IngestMediaCommand
                {
                    FilePath = filePath, 
                    Title = Path.GetFileNameWithoutExtension(filePath)
                };
                
                var result = await mediator.Send(command, cancellationToken);
                
                if (result.IsSuccess)
                {
                    _logger.LogInformation("Ingestion of {FilePath} was successful.", filePath);
                }
                else
                {
                    _logger.LogError("Ingestion of {FilePath} failed with error: {Error}", filePath, result.Exception);
                }
            }
        }
        
        _logger.LogInformation("Library scan complete.");
    }
}