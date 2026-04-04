using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

namespace WkApi.Features.FutureMatches;

/// <summary>
/// Downloads remote image URLs once, stores under Data/Cache/img, serves via /api/future-matches/media/{file}.
/// Cached files are never expired or deleted by this service (permanent local copy once fetched).
/// </summary>
public class FutureMatchesImageCache
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

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

                _logger.LogInformation("Caching remote image: {Url}", icon);
                using var response = await _http.GetAsync(icon, HttpCompletionOption.ResponseHeadersRead, ct)
                    .ConfigureAwait(false);
                response.EnsureSuccessStatusCode();
                var ext = PickExtension(icon, response.Content.Headers.ContentType?.MediaType);
                var finalName = hash + ext;
                var finalPath = Path.Combine(_imgDir, finalName);

                await using (var fs = new FileStream(finalPath, FileMode.Create, FileAccess.Write, FileShare.None)) {
                    await response.Content.CopyToAsync(fs, ct).ConfigureAwait(false);
                }

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

        var matches = Directory.GetFiles(_imgDir, hash + ".*");
        return matches.Length > 0 ? Path.GetFileName(matches[0]) : null;
    }

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
