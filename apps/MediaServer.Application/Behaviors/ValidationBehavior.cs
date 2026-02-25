using FluentValidation;
using MediatR;
using OperationResult;

namespace MediaServer.Application.Behaviors;

public class ValidationBehavior<TRequest, TResponse> : IPipelineBehavior<TRequest, TResponse> where TRequest : IRequest<TResponse>
{
    private readonly IEnumerable<IValidator<TRequest>> _validators;
    
    public ValidationBehavior(IEnumerable<IValidator<TRequest>> validators)
    {
        _validators = validators;
    }
    
    public async Task<TResponse> Handle(TRequest request, RequestHandlerDelegate<TResponse> next, CancellationToken cancellationToken)
    {
        if (!_validators.Any())
        {
            return await next();
        }
        
        var context = new ValidationContext<TRequest>(request);
        var validationResults = await Task.WhenAll(_validators.Select(v => v.ValidateAsync(context, cancellationToken)));
        var failures = validationResults.SelectMany(r => r.Errors).Where(f => f != null).ToList();

        if (failures.Count != 0)
        {
            var errorMessage = string.Join(" | ", failures.Select(f => f.ErrorMessage));
            var responseType = typeof(TResponse);
            if (responseType.IsGenericType && responseType.GetGenericTypeDefinition() == typeof(Result<>))
            {
                var failedResult = Activator.CreateInstance(responseType);
                var errorProperty = responseType.GetProperty("Error");
                var errorInstance = Activator.CreateInstance(errorProperty!.PropertyType);
                errorProperty.PropertyType.GetProperty("Message")?.SetValue(errorInstance, errorMessage);
                errorProperty.SetValue(failedResult, errorInstance);

                var successProperty = responseType.GetProperty("IsSuccess");
                successProperty?.SetValue(failedResult, false);
                return (TResponse)failedResult!;
            }
            
            throw new ValidationException(failures);
        }
        
        return await next();
    }
}