using MediaServer.Application.Interfaces.Queues;
using MediaServer.Application.Interfaces.Repositories;
using MediaServer.Application.Interfaces.Services;
using MediaServer.Application.Models;
using MediaServer.Infrastructure.BackgroundJobs;
using MediaServer.Infrastructure.Media;
using MediaServer.Infrastructure.Persistence.Context;
using MediaServer.Infrastructure.Persistence.Repositories;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace MediaServer.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(this IServiceCollection services, AppSettings appSettings)
    {
        services.AddDbContext<MediaDbContext>(options =>
            options.UseNpgsql(appSettings.PostgresSettings.ConnectionString(),
                b => b.MigrationsAssembly(typeof(MediaDbContext).Assembly.FullName)));
        
        services.AddScoped<IUnitOfWork, UnitOfWork>();
        services.AddScoped<IMediaRepository, MediaRepository>();
        services.AddScoped<ISubtitleRepository, SubtitleRepository>();
        services.AddScoped<IMediaProfileRepository, MediaProfileRepository>();
        services.AddScoped<IMovieRepository, MovieRepository>();
        services.AddScoped<ITvShowRepository, TvShowRepository>();
        
        services.AddSingleton<IFileAnalyzer, FfProbeFileAnalyzer>();
        services.AddSingleton<ITranscodeManager, FFmpegTranscodeManager>();
        services.AddSingleton<ITranscodeQueue, TranscodeJobQueue>();
        services.AddSingleton<ITranscodeProgressCache, TranscodeProgressCache>();
        
        services.AddHostedService<LibraryScannerService>();
        services.AddHostedService<MediaDirectoryMonitorService>();
        services.AddHostedService<VodTranscodeWorker>();
        return services;
    }

}