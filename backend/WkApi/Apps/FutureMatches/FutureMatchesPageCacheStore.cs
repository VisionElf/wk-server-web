using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Options;

namespace WkApi.Apps.FutureMatches;

/// <summary>
/// Persists raw Liquipedia HTML per URL. Fresh network fetch only when cache entry is missing or older than TTL;
/// callers always receive HTML and parse as if it were live.
/// </summary>
public class FutureMatchesPageCacheStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly IOptions<FutureMatchesOptions> _options;
    private readonly ILogger<FutureMatchesPageCacheStore> _logger;
    private readonly SemaphoreSlim _gate = new(1, 1);

    public FutureMatchesPageCacheStore(
        IHostEnvironment env,
        IOptions<FutureMatchesOptions> options,
        ILogger<FutureMatchesPageCacheStore> logger)
    {
        _options = options;
        _logger = logger;
        var rel = options.Value.HtmlPageCacheDirectoryRelativePath.Trim();
        CacheDirectory = Path.GetFullPath(Path.Combine(env.ContentRootPath, rel));
    }

    public string CacheDirectory { get; }

    /// <summary>
    /// Returns cached HTML if a valid entry exists for the TTL window; otherwise downloads, stores, and returns.
    /// <paramref name="fetchedFromNetwork"/> is true only when an HTTP request was made.
    /// </summary>
    public async Task<(string Html, bool FetchedFromNetwork)> GetOrDownloadAsync(
        string url,
        HttpClient http,
        CancellationToken ct = default,
        bool forceRefresh = false)
    {
        var normalized = NormalizeUrlForCacheKey(url);
        var key = HashUrl(normalized);
        var htmlPath = Path.Combine(CacheDirectory, key + ".html");
        var metaPath = Path.Combine(CacheDirectory, key + ".meta.json");
        var ttl = TtlForUrl(normalized);

        await _gate.WaitAsync(ct).ConfigureAwait(false);
        try {
            if (!forceRefresh
                && File.Exists(htmlPath)
                && File.Exists(metaPath)) {
                try {
                    await using var metaStream = File.OpenRead(metaPath);
                    var meta = await JsonSerializer.DeserializeAsync<PageCacheMeta>(metaStream, JsonOptions, ct)
                        .ConfigureAwait(false);
                    if (meta?.FetchedAtUtc != null) {
                        var fetched = NormalizeUtc(meta.FetchedAtUtc);
                        var age = DateTime.UtcNow - fetched;
                        if (age < ttl) {
                            _logger.LogDebug("Liquipedia page cache hit ({Age} old): {Url}", age, normalized);
                            var cached = await File.ReadAllTextAsync(htmlPath, ct).ConfigureAwait(false);
                            await TouchLastServedAsync(metaPath, meta, normalized, ct).ConfigureAwait(false);
                            return (cached, false);
                        }

                        _logger.LogInformation(
                            "Liquipedia page cache expired ({Age} >= {Ttl}): {Url}",
                            age,
                            ttl,
                            normalized);
                    }
                }
                catch (Exception ex) {
                    _logger.LogWarning(ex, "Invalid page cache meta, refetching: {Url}", normalized);
                }
            }
            _logger.LogInformation(
                forceRefresh
                    ? "Fetching Liquipedia page (manual refetch): {Url}"
                    : "Fetching Liquipedia page (cache miss): {Url}",
                normalized);
            using var response = await http.GetAsync(normalized, HttpCompletionOption.ResponseHeadersRead, ct)
                .ConfigureAwait(false);
            response.EnsureSuccessStatusCode();
            var html = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);

            Directory.CreateDirectory(CacheDirectory);
            await File.WriteAllTextAsync(htmlPath, html, ct).ConfigureAwait(false);
            var now = DateTime.UtcNow;
            var metaOut = new PageCacheMeta {
                Url = normalized,
                FetchedAtUtc = now,
                LastServedAtUtc = now,
            };
            await File.WriteAllTextAsync(
                    metaPath,
                    JsonSerializer.Serialize(metaOut, JsonOptions),
                    ct)
                .ConfigureAwait(false);

            return (html, true);
        }
        finally {
            _gate.Release();
        }
    }

    private static string NormalizeUrlForCacheKey(string url)
    {
        url = url.Trim();
        if (!Uri.TryCreate(url, UriKind.Absolute, out var u)) {
            return url;
        }

        var b = new UriBuilder(u) { Fragment = "" };
        return b.Uri.AbsoluteUri;
    }

    private static string HashUrl(string url)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(url));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    /// <summary>Lists on-disk HTML cache entries (URL + fetch time + expiry from current TTL).</summary>
    public IReadOnlyList<FutureMatchesPageCacheEntryDto> ListCachedEntries()
    {
        var list = new List<FutureMatchesPageCacheEntryDto>();
        if (!Directory.Exists(CacheDirectory)) {
            return list;
        }

        foreach (var metaPath in Directory.EnumerateFiles(CacheDirectory, "*.meta.json")) {
            try {
                var json = File.ReadAllText(metaPath);
                var meta = JsonSerializer.Deserialize<PageCacheMeta>(json, JsonOptions);
                if (meta == null || string.IsNullOrWhiteSpace(meta.Url)) {
                    continue;
                }

                var fetched = NormalizeUtc(meta.FetchedAtUtc);
                var lastServed = meta.LastServedAtUtc.HasValue
                    ? NormalizeUtc(meta.LastServedAtUtc.Value)
                    : fetched;
                var ttl = TtlForUrl(meta.Url);
                list.Add(new FutureMatchesPageCacheEntryDto(meta.Url, fetched, lastServed, fetched + ttl));
            }
            catch (Exception ex) {
                _logger.LogDebug(ex, "Skip unreadable page cache meta: {Path}", metaPath);
            }
        }

        return list.OrderBy(x => x.Url, StringComparer.OrdinalIgnoreCase).ToList();
    }

    private TimeSpan TtlForUrl(string normalizedUrl)
    {
        if (IsMainPageUrl(normalizedUrl)) {
            return TimeSpan.FromHours(Math.Max(0.25, _options.Value.HtmlPageCacheMainPageTtlHours));
        }

        return TimeSpan.FromHours(Math.Max(0.25, _options.Value.HtmlPageCacheTtlHours));
    }

    private static bool IsMainPageUrl(string normalizedUrl)
    {
        if (!Uri.TryCreate(normalizedUrl.Trim(), UriKind.Absolute, out var u)) {
            return false;
        }

        var path = u.AbsolutePath.TrimEnd('/');
        var i = path.LastIndexOf('/');
        var last = i >= 0 ? path[(i + 1)..] : path;
        return string.Equals(last, "Main_Page", StringComparison.OrdinalIgnoreCase);
    }

    private static DateTime NormalizeUtc(DateTime dt) =>
        dt.Kind == DateTimeKind.Unspecified
            ? DateTime.SpecifyKind(dt, DateTimeKind.Utc)
            : dt.ToUniversalTime();

    private async Task TouchLastServedAsync(
        string metaPath,
        PageCacheMeta meta,
        string normalizedUrl,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        meta.Url = normalizedUrl;
        meta.LastServedAtUtc = now;
        await File.WriteAllTextAsync(metaPath, JsonSerializer.Serialize(meta, JsonOptions), ct)
            .ConfigureAwait(false);
    }

    private sealed class PageCacheMeta
    {
        public string Url { get; set; } = "";
        public DateTime FetchedAtUtc { get; set; }
        public DateTime? LastServedAtUtc { get; set; }
    }
}
