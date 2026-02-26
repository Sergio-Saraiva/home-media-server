
using MediaServer.Application.Common;
using MediatR;
using Microsoft.AspNetCore.Mvc;
using OperationResult;

namespace MediaServer.Api.Controllers;

[ApiController]
public abstract class BaseController : ControllerBase
{
    private readonly IMediator _mediator;

    public BaseController(IMediator mediator)
    {
        _mediator = mediator;
    }
    
    protected async Task<IActionResult> SendRequest<TResponse>(IRequest<Result<TResponse>> request)
    {
        var result = await _mediator.Send(request);

        var response = new ResponseMessage<TResponse>
        {
            IsSuccess = result.IsSuccess
        };

        if (result.IsSuccess)
        {
            return StatusCode(StatusCodes.Status200OK, new ResponseMessage<TResponse>
            {
                Result = result.Value,
                ErrorMessage = null,
                IsSuccess = result.IsSuccess,
            });
        }
        
        if (result.Exception is ApiErrorException apiErrorException)
        {
            return StatusCode((int)apiErrorException.StatusCode, new ResponseMessage<TResponse>
            {
                IsSuccess = false,
                ErrorMessage = apiErrorException.Message
            });
        }

        return StatusCode(StatusCodes.Status500InternalServerError, new ResponseMessage<TResponse>
        {
            IsSuccess = false,
            ErrorMessage = "Internal Server Error"
        });
    }
}