namespace WkApi.Apps.FutureMatches;

/// <summary>
/// Live status while a matches refresh crawl runs (for UI polling).
/// </summary>
public sealed class FutureMatchesCrawlProgress
{
    private readonly object _sync = new();
    private bool _running;
    private string? _currentUrl;
    private string? _detail;

    public void BeginCrawl()
    {
        lock (_sync) {
            _running = true;
            _currentUrl = null;
            _detail = null;
        }
    }

    public void SetCurrentUrl(string? url)
    {
        lock (_sync) {
            if (_running) {
                _currentUrl = url;
            }
        }
    }

    public void SetDetail(string? detail)
    {
        lock (_sync) {
            if (_running) {
                _detail = detail;
            }
        }
    }

    public void EndCrawl()
    {
        lock (_sync) {
            _running = false;
            _currentUrl = null;
            _detail = null;
        }
    }

    public FutureMatchesCrawlProgressSnapshot GetSnapshot()
    {
        lock (_sync) {
            return new FutureMatchesCrawlProgressSnapshot(_running, _currentUrl, _detail);
        }
    }
}

public record FutureMatchesCrawlProgressSnapshot(bool Running, string? CurrentUrl, string? Detail);
