namespace MediaServer.Application.Common;

public class ResponseMessage<T>
{
    public T? Result { get; set; }
    public string? ErrorMessage { get; set; }
    public bool IsSuccess { get; set;}
}