using MediaServer.Application;
using MediaServer.Application.Models;
using MediaServer.Infrastructure;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace MediaServer.IOC;

public static class NativeInjectorBootStrapper
{
    public static IServiceCollection RegisterServices(this IServiceCollection services, IConfiguration configuration)
    {
        var appSettings = new AppSettings();
        configuration.Bind(appSettings);
        services
            .AddApplication()
            .AddInfrastructure(appSettings);
            

        return services;
    }
}