using System.Globalization;
using Microsoft.Extensions.Logging;

namespace WkApi.Infrastructure.Logging;

/// <summary>
/// Writes log entries at Information+ into <see cref="ServerLogBuffer"/>.
/// Drops verbose Microsoft.* below Warning to keep the console readable.
/// </summary>
public sealed class ServerLogBufferLoggerProvider(ServerLogBuffer buffer) : ILoggerProvider
{
    public ILogger CreateLogger(string categoryName) => new BufferLogger(buffer, categoryName);

    public void Dispose()
    {
    }

    /// <summary>
    /// HTTP request start/finish lines (page and API calls) use this category at Information.
    /// </summary>
    private static bool IsMicrosoftHostingRequestLog(string category) =>
        category.Equals("Microsoft.AspNetCore.Hosting.Diagnostics", StringComparison.Ordinal);

    /// <summary>
    /// Avoid echo: polling this endpoint would fill the buffer with self-referential request lines.
    /// </summary>
    private const string ServerLogsPathFragment = "/api/server-logs";

    private static bool IsServerLogsPollNoise(string category, string message) =>
        IsMicrosoftHostingRequestLog(category)
        && message.Contains(ServerLogsPathFragment, StringComparison.OrdinalIgnoreCase);

    private sealed class BufferLogger(ServerLogBuffer buffer, string category) : ILogger
    {
        public IDisposable? BeginScope<TState>(TState state)
            where TState : notnull =>
            NullDisposable.Instance;

        public bool IsEnabled(LogLevel logLevel) => logLevel >= LogLevel.Information;

        public void Log<TState>(
            LogLevel logLevel,
            EventId eventId,
            TState state,
            Exception? exception,
            Func<TState, Exception?, string> formatter)
        {
            if (!IsEnabled(logLevel)) {
                return;
            }

            if (logLevel < LogLevel.Warning
                && category.StartsWith("Microsoft.", StringComparison.Ordinal)
                && !IsMicrosoftHostingRequestLog(category)) {
                return;
            }

            var message = formatter(state, exception);
            if (IsServerLogsPollNoise(category, message)) {
                return;
            }

            var ts = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss.fff", CultureInfo.InvariantCulture);
            var line = $"{ts}Z [{logLevel}] {category}: {message}";
            buffer.AppendLine(line);
            if (exception != null) {
                buffer.AppendLine(exception.ToString());
            }
        }
    }

    private sealed class NullDisposable : IDisposable
    {
        public static readonly NullDisposable Instance = new();
        public void Dispose()
        {
        }
    }
}
