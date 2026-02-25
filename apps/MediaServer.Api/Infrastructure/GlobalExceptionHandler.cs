using MediaServer.Application.Common;
using Microsoft.AspNetCore.Diagnostics;

namespace MediaServer.Api.Infrastructure;

public class GlobalExceptionHandler : IExceptionHandler
{
    private readonly ILogger<GlobalExceptionHandler> _logger;

    public GlobalExceptionHandler(ILogger<GlobalExceptionHandler> logger)
    {
        _logger = logger;
    }

    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken cancellationToken)
    {
        _logger.LogError(exception, "An exception occurred: {Message}", exception.Message);

        var response = new ResponseMessage<object>
        {
            IsSuccess = false,
            Result = null
        };

        if (exception is ApiErrorException apiErrorException)
        {
            httpContext.Response.StatusCode = (int)apiErrorException.StatusCode;
            response.ErrorMessage = apiErrorException.Message;
        }
        else
        {
            httpContext.Response.StatusCode = StatusCodes.Status500InternalServerError;
            response.ErrorMessage = "Internal server error.";
        }
        
        await httpContext.Response.WriteAsJsonAsync(response, cancellationToken);
        
        return true;
    }
}