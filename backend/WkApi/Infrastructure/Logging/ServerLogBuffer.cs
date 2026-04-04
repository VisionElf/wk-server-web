namespace WkApi.Infrastructure.Logging;

/// <summary>
/// In-memory ring buffer of recent log lines for the Console UI.
/// </summary>
public sealed class ServerLogBuffer
{
    private const int MaxLines = 2000;
    private readonly object _sync = new();
    private readonly Queue<string> _lines = new();

    public void AppendLine(string line)
    {
        if (string.IsNullOrEmpty(line)) {
            return;
        }

        lock (_sync) {
            _lines.Enqueue(line);
            while (_lines.Count > MaxLines) {
                _lines.Dequeue();
            }
        }
    }

    public IReadOnlyList<string> Snapshot()
    {
        lock (_sync) {
            return _lines.ToArray();
        }
    }
}
