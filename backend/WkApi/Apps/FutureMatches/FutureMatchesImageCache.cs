using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

namespace WkApi.Apps.FutureMatches;

/// <summary>
/// Downloads remote image URLs once, stores under Data/Cache/img, serves via /api/future-matches/media/{file}.
/// Cached files are never expired or deleted by this service (permanent local copy once fetched).
/// </summary>
public class FutureMatchesImageCache
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();
    private static readonly JsonSerializerOptions JsonOptions = new() { WriteIndented = false };

    private readonly HttpClient _http;
    private readonly string _imgDir;
    private readonly SemaphoreSlim _gate = new(1, 1);
    private readonly ILogger<FutureMatchesImageCache> _logger;

    private const string MediaPathPrefix = "/api/future-matches/media/";

    public FutureMatchesImageCache(
        HttpClient http,
        IHostEnvironment env,
        IOptions<FutureMatchesOptions> options,
        ILogger<FutureMatchesImageCache> logger)
    {
        _http = http;
        _logger = logger;
        var cacheFile = Path.GetFullPath(
            Path.Combine(env.ContentRootPath, options.Value.CacheFileRelativePath));
        _imgDir = Path.Combine(Path.GetDirectoryName(cacheFile)!, "img");
    }

    /// <summary>
    /// Returns true if any icon URL was updated (caller may persist JSON).
    /// </summary>
    public async Task<bool> MaterializeGameVisualsAsync(
        FutureMatchesPayloadDto payload,
        CancellationToken ct = default)
    {
        if (payload.GameVisuals == null || payload.GameVisuals.Count == 0) {
            return false;
        }

        var changed = false;
        foreach (var g in payload.GameVisuals) {
            var nextLogo = await ResolveAsync(g.Logo, ct).ConfigureAwait(false);
            if (nextLogo != g.Logo) {
                g.Logo = nextLogo;
                changed = true;
            }

            var nextBanner = await ResolveAsync(g.Banner, ct).ConfigureAwait(false);
            if (nextBanner != g.Banner) {
                g.Banner = nextBanner;
                changed = true;
            }
        }

        return changed;
    }

    public async Task<bool> MaterializeMatchIconsAsync(
        FutureMatchesPayloadDto payload,
        CancellationToken ct = default)
    {
        var changed = false;
        foreach (var m in payload.Matches) {
            if (m.Team1 != null) {
                var next = await ResolveAsync(m.Team1.Icon, ct).ConfigureAwait(false);
                if (next != m.Team1.Icon) {
                    m.Team1.Icon = next;
                    changed = true;
                }
            }

            if (m.Team2 != null) {
                var next = await ResolveAsync(m.Team2.Icon, ct).ConfigureAwait(false);
                if (next != m.Team2.Icon) {
                    m.Team2.Icon = next;
                    changed = true;
                }
            }
        }

        return changed;
    }

    private async Task<string?> ResolveAsync(string? icon, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(icon)) {
            return icon;
        }

        icon = icon.Trim();
        if (icon.StartsWith(MediaPathPrefix, StringComparison.Ordinal)) {
            return icon;
        }

        if (!icon.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !icon.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
            return icon;
        }

        try {
            Directory.CreateDirectory(_imgDir);
            var hash = HashFileName(icon);

            // Reuse existing file forever (no TTL); hash is content-addressed by source URL.
            string? existing = FindExistingByHash(hash);
            if (existing != null) {
                return MediaPathPrefix + existing;
            }

            await _gate.WaitAsync(ct).ConfigureAwait(false);
            try {
                existing = FindExistingByHash(hash);
                if (existing != null) {
                    return MediaPathPrefix + existing;
                }

                var finalName = await DownloadToNewFileAsync(icon, ct).ConfigureAwait(false);
                return MediaPathPrefix + finalName;
            }
            finally {
                _gate.Release();
            }
        }
        catch (Exception ex) {
            _logger.LogWarning(ex, "Could not cache icon, keeping remote URL: {Url}", icon);
            return icon;
        }
    }

    private string? FindExistingByHash(string hash)
    {
        if (!Directory.Exists(_imgDir)) {
            return null;
        }

        foreach (var path in Directory.GetFiles(_imgDir, hash + ".*")) {
            var fn = Path.GetFileName(path);
            if (IsSafeImageFileName(fn)) {
                return fn;
            }
        }

        return null;
    }

    /// <summary>Lists cached image files (one row per hash). Legacy files may have no source URL metadata.</summary>
    public IReadOnlyList<FutureMatchesImageCacheEntryDto> ListCachedEntries()
    {
        var list = new List<FutureMatchesImageCacheEntryDto>();
        if (!Directory.Exists(_imgDir)) {
            return list;
        }

        var seenHashes = new HashSet<string>(StringComparer.Ordinal);
        foreach (var path in Directory.EnumerateFiles(_imgDir)) {
            var fn = Path.GetFileName(path);
            if (!IsSafeImageFileName(fn)) {
                continue;
            }

            var hash = fn[..64];
            if (!seenHashes.Add(hash)) {
                continue;
            }

            var full = Path.Combine(_imgDir, fn);
            var fetched = File.GetLastWriteTimeUtc(full);
            string? sourceUrl = null;
            var metaPath = Path.Combine(_imgDir, hash + ".meta.json");
            if (File.Exists(metaPath)) {
                try {
                    var json = File.ReadAllText(metaPath);
                    var meta = JsonSerializer.Deserialize<ImageCacheMeta>(json, JsonOptions);
                    if (meta != null) {
                        sourceUrl = string.IsNullOrWhiteSpace(meta.SourceUrl) ? null : meta.SourceUrl.Trim();
                        if (meta.FetchedAtUtc != default) {
                            fetched = meta.FetchedAtUtc.Kind == DateTimeKind.Unspecified
                                ? DateTime.SpecifyKind(meta.FetchedAtUtc, DateTimeKind.Utc)
                                : meta.FetchedAtUtc.ToUniversalTime();
                        }
                    }
                }
                catch (Exception ex) {
                    _logger.LogDebug(ex, "Skip unreadable image cache meta: {Path}", metaPath);
                }
            }

            list.Add(new FutureMatchesImageCacheEntryDto(
                fn,
                sourceUrl,
                fetched,
                MediaPathPrefix + fn));
        }

        return list.OrderBy(x => x.FileName, StringComparer.OrdinalIgnoreCase).ToList();
    }

    /// <summary>Re-downloads and replaces the file for this source URL (same hash as normal cache).</summary>
    public async Task<FutureMatchesImageCacheEntryDto> RefetchAsync(string sourceUrl, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(sourceUrl)) {
            throw new ArgumentException("Source URL is required.", nameof(sourceUrl));
        }

        sourceUrl = sourceUrl.Trim();
        if (!sourceUrl.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            && !sourceUrl.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
            throw new ArgumentException("Source URL must be an absolute http(s) URL.", nameof(sourceUrl));
        }

        await _gate.WaitAsync(ct).ConfigureAwait(false);
        try {
            Directory.CreateDirectory(_imgDir);
            var hash = HashFileName(sourceUrl);
            var existing = FindExistingByHash(hash);
            var keepExt = existing != null ? Path.GetExtension(existing) : null;
            DeleteCachedFilesForHash(hash);
            var finalName = await DownloadToNewFileAsync(sourceUrl, ct, keepExt).ConfigureAwait(false);
            var physical = Path.Combine(_imgDir, finalName);
            var fetched = File.GetLastWriteTimeUtc(physical);
            return new FutureMatchesImageCacheEntryDto(
                finalName,
                sourceUrl,
                fetched,
                MediaPathPrefix + finalName);
        }
        finally {
            _gate.Release();
        }
    }

    private void DeleteCachedFilesForHash(string hash)
    {
        if (!Directory.Exists(_imgDir)) {
            return;
        }

        foreach (var path in Directory.GetFiles(_imgDir, hash + ".*")) {
            try {
                File.Delete(path);
            }
            catch (Exception ex) {
                _logger.LogWarning(ex, "Could not delete cached image path: {Path}", path);
            }
        }
    }

    private async Task<string> DownloadToNewFileAsync(
        string sourceUrl,
        CancellationToken ct,
        string? preferredExtension = null)
    {
        _logger.LogInformation("Caching remote image: {Url}", sourceUrl);
        using var response = await _http.GetAsync(sourceUrl, HttpCompletionOption.ResponseHeadersRead, ct)
            .ConfigureAwait(false);
        response.EnsureSuccessStatusCode();
        var hash = HashFileName(sourceUrl);
        var ext = NormalizeImageExtension(preferredExtension)
            ?? PickExtension(sourceUrl, response.Content.Headers.ContentType?.MediaType);
        var finalName = hash + ext;
        var finalPath = Path.Combine(_imgDir, finalName);
        await using (var fs = new FileStream(finalPath, FileMode.Create, FileAccess.Write, FileShare.None)) {
            await response.Content.CopyToAsync(fs, ct).ConfigureAwait(false);
        }

        var meta = new ImageCacheMeta(sourceUrl, DateTime.UtcNow);
        var metaPath = Path.Combine(_imgDir, hash + ".meta.json");
        await File.WriteAllTextAsync(
                metaPath,
                JsonSerializer.Serialize(meta, JsonOptions),
                ct)
            .ConfigureAwait(false);
        return finalName;
    }

    private static string? NormalizeImageExtension(string? ext)
    {
        if (string.IsNullOrEmpty(ext)) {
            return null;
        }

        ext = ext.ToLowerInvariant();
        return ext is ".png" or ".jpg" or ".jpeg" or ".webp" or ".gif" or ".svg" ? ext : null;
    }

    private sealed record ImageCacheMeta(string SourceUrl, DateTime FetchedAtUtc);

    private static string HashFileName(string url)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(url));
        return Convert.ToHexString(bytes).ToLowerInvariant();
    }

    private static string PickExtensionFromUrl(string url)
    {
        try {
            var path = new Uri(url).AbsolutePath;
            var ext = Path.GetExtension(path).ToLowerInvariant();
            if (ext.Length is >= 4 and <= 8 && ext[0] == '.') {
                return ext;
            }
        }
        catch {
            // ignore
        }

        return ".png";
    }

    private static string PickExtension(string url, string? mediaType)
    {
        var fromUrl = PickExtensionFromUrl(url);
        if (fromUrl is ".jpg" or ".jpeg" or ".webp" or ".gif" or ".svg") {
            return fromUrl;
        }

        return mediaType switch {
            "image/png" => ".png",
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            "image/svg+xml" => ".svg",
            _ => fromUrl,
        };
    }

    /// <summary>Safe media file name: 64 hex chars + extension.</summary>
    public static bool IsSafeImageFileName(string? fileName)
    {
        if (string.IsNullOrEmpty(fileName) || fileName.Length < 68) {
            return false;
        }

        var dot = fileName.LastIndexOf('.');
        if (dot != 64) {
            return false;
        }

        var hashPart = fileName[..dot];
        if (!hashPart.All(IsLowerHex)) {
            return false;
        }

        var ext = fileName[dot..].ToLowerInvariant();
        return ext is ".png" or ".jpg" or ".jpeg" or ".webp" or ".gif" or ".svg";
    }

    private static bool IsLowerHex(char c) => c is (>= '0' and <= '9') or (>= 'a' and <= 'f');

    public bool TryGetExistingPath(string fileName, out string physicalPath)
    {
        physicalPath = "";
        if (!IsSafeImageFileName(fileName)) {
            return false;
        }

        var path = Path.GetFullPath(Path.Combine(_imgDir, fileName));
        var root = Path.GetFullPath(_imgDir);
        if (!path.StartsWith(root, Path.DirectorySeparatorChar == '\\'
                ? StringComparison.OrdinalIgnoreCase
                : StringComparison.Ordinal)
            || !File.Exists(path)) {
            return false;
        }

        physicalPath = path;
        return true;
    }

    public static string GetContentType(string fileName)
    {
        if (fileName.EndsWith(".svg", StringComparison.OrdinalIgnoreCase)) {
            return "image/svg+xml";
        }

        return ContentTypes.TryGetContentType(fileName, out var ct)
            ? ct
            : "application/octet-stream";
    }
}
