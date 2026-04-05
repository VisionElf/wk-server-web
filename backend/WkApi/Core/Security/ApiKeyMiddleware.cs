using Microsoft.Extensions.Options;

namespace WkApi.Infrastructure.Security;

public sealed class ApiKeyMiddleware
{
    private readonly RequestDelegate _next;
    private readonly string? _apiKey;

    public ApiKeyMiddleware(RequestDelegate next, IOptions<WkApiOptions> options)
    {
        _next = next;
        _apiKey = options.Value.ApiKey?.Trim();
    }

    public async Task InvokeAsync(HttpContext context)
    {
        if (string.IsNullOrEmpty(_apiKey)) {
            await _next(context).ConfigureAwait(false);
            return;
        }

        if (HttpMethods.IsOptions(context.Request.Method)) {
            await _next(context).ConfigureAwait(false);
            return;
        }

        if (!context.Request.Headers.TryGetValue("X-Api-Key", out var provided)
            || provided.Count != 1
            || !string.Equals(provided.ToString(), _apiKey, StringComparison.Ordinal)) {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await _next(context).ConfigureAwait(false);
    }
}
