using System.Diagnostics;
using MediatR;
using Microsoft.Extensions.Logging;

namespace MediaServer.Application.Behaviors;

public class LoggingBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse>
    where TRequest : IRequest<TResponse>
{
    private readonly ILogger<LoggingBehavior<TRequest, TResponse>> _logger;
    
    public LoggingBehavior(ILogger<LoggingBehavior<TRequest, TResponse>> logger)
    {
        _logger = logger;
    }
    
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        var requestName = typeof(TRequest).Name;
        var timer = Stopwatch.StartNew();

        try
        {
            _logger.LogInformation("[START] Executing MediatR Request: {RequestName}", requestName);
            
            var response = await next();

            timer.Stop();
            _logger.LogInformation("[END] Executed {RequestName} in {ElapsedMilliseconds}ms", requestName, timer.ElapsedMilliseconds);
            
            return response;
        }
        catch (Exception ex)
        {
            timer.Stop();
            _logger.LogError(ex, "[ERROR] Request {RequestName} failed after {ElapsedMilliseconds}ms", requestName, timer.ElapsedMilliseconds);
            throw;
        }
    }
}