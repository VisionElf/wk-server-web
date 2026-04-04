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
                && category.StartsWith("Microsoft.", StringComparison.Ordinal)) {
                return;
            }

            var message = formatter(state, exception);
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
