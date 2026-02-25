using System.Net;

namespace MediaServer.Application.Common;

public class ApiErrorException : Exception
{
    public HttpStatusCode StatusCode { get;}
    public ApiErrorException(HttpStatusCode statusCode, string message) : base(message)
    {
        StatusCode = statusCode;
    }
}