using System.Diagnostics.CodeAnalysis;
using System.Text.RegularExpressions;
using Microsoft.AspNetCore.StaticFiles;
using Microsoft.Extensions.Options;

namespace WkApi.Features.FutureMatches;

/// <summary>
/// Per-game banner images uploaded from the Follow settings UI. Files live next to the main cache directory.
/// </summary>
public sealed class FutureMatchesUserBannerStore
{
    private static readonly FileExtensionContentTypeProvider ContentTypes = new();

    private static readonly Regex SafeGameId = new(
        @"^[a-z][a-z0-9_-]{1,39}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly string[] Extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"];

    public const string RoutePrefix = "/api/future-matches/user-banners/";

    private readonly string _dir;
    private readonly ILogger<FutureMatchesUserBannerStore> _logger;

    public FutureMatchesUserBannerStore(
        IHostEnvironment env,
        IOptions<FutureMatchesOptions> options,
        ILogger<FutureMatchesUserBannerStore> logger)
    {
        _logger = logger;
        var cacheFile = Path.GetFullPath(
            Path.Combine(env.ContentRootPath, options.Value.CacheFileRelativePath));
        _dir = Path.Combine(Path.GetDirectoryName(cacheFile)!, "fm-user-banners");
    }

    public static bool TryNormalizeGameId(string gameId, out string normalized)
    {
        normalized = gameId.Trim().ToLowerInvariant();
        return SafeGameId.IsMatch(normalized);
    }

    public string? GetPublicUrlIfExists(string gameId)
    {
        if (!TryNormalizeGameId(gameId, out var id)) {
            return null;
        }

        return FindExistingPath(id) != null ? RoutePrefix + id : null;
    }

    public bool TryGetPhysicalPath(
        string gameId,
        [NotNullWhen(true)] out string? physicalPath,
        [NotNullWhen(true)] out string? fileName)
    {
        physicalPath = null;
        fileName = null;
        if (!TryNormalizeGameId(gameId, out var id)) {
            return false;
        }

        var path = FindExistingPath(id);
        if (path == null) {
            return false;
        }

        physicalPath = path;
        fileName = Path.GetFileName(path);
        return true;
    }

    public async Task SaveAsync(string gameId, Stream content, string extension, CancellationToken ct = default)
    {
        if (!TryNormalizeGameId(gameId, out var id)) {
            throw new ArgumentException("Invalid game id.", nameof(gameId));
        }

        extension = extension.ToLowerInvariant();
        if (Extensions.All(e => e != extension)) {
            throw new ArgumentException("Invalid file extension.", nameof(extension));
        }

        Directory.CreateDirectory(_dir);
        DeleteAllForGame(id);
        var path = Path.Combine(_dir, id + extension);
        await using (var fs = new FileStream(path, FileMode.Create, FileAccess.Write, FileShare.None)) {
            await content.CopyToAsync(fs, ct).ConfigureAwait(false);
        }

        _logger.LogInformation("Saved user banner for game {GameId} ({Path})", id, path);
    }

    public void DeleteAllForGame(string gameId)
    {
        if (!TryNormalizeGameId(gameId, out var id)) {
            return;
        }

        foreach (var ext in Extensions) {
            var p = Path.Combine(_dir, id + ext);
            try {
                if (File.Exists(p)) {
                    File.Delete(p);
                    _logger.LogInformation("Removed user banner file {Path}", p);
                }
            }
            catch (Exception ex) {
                _logger.LogWarning(ex, "Could not delete banner {Path}", p);
            }
        }
    }

    private string? FindExistingPath(string normalizedId)
    {
        foreach (var ext in Extensions) {
            var p = Path.Combine(_dir, normalizedId + ext);
            if (File.Exists(p)) {
                return p;
            }
        }

        return null;
    }

    public static string PickExtensionFromContentType(string? contentType)
    {
        return contentType?.ToLowerInvariant() switch {
            "image/png" => ".png",
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/webp" => ".webp",
            "image/gif" => ".gif",
            _ => throw new ArgumentException("Use PNG, JPEG, WebP, or GIF."),
        };
    }

    public static string GetContentTypeForFileName(string fileName) =>
        ContentTypes.TryGetContentType(fileName, out var ct)
            ? ct
            : "application/octet-stream";
}
