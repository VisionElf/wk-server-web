using System.Net.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using WkApi.Apps.FutureMatches;
using WkApi.Infrastructure.Files;

namespace WkApi.Apps.FutureMatches.Controllers;

[ApiController]
[Route("api/future-matches")]
public class FutureMatchesController : ControllerBase
{
    private readonly FutureMatchesCoordinator _coordinator;
    private readonly FutureMatchesImageCache _imageCache;
    private readonly FutureMatchesSettingsService _settings;
    private readonly FutureMatchesPageCacheStore _pageCacheStore;
    private readonly FutureMatchesCrawlProgress _crawlProgress;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly FutureMatchesUserBannerStore _userBanners;
    private readonly FutureMatchesOptions _fmOptions;

    public FutureMatchesController(
        FutureMatchesCoordinator coordinator,
        FutureMatchesImageCache imageCache,
        FutureMatchesSettingsService settings,
        FutureMatchesPageCacheStore pageCacheStore,
        FutureMatchesCrawlProgress crawlProgress,
        IHttpClientFactory httpClientFactory,
        FutureMatchesUserBannerStore userBanners,
        IOptions<FutureMatchesOptions> fmOptions)
    {
        _coordinator = coordinator;
        _imageCache = imageCache;
        _settings = settings;
        _pageCacheStore = pageCacheStore;
        _crawlProgress = crawlProgress;
        _httpClientFactory = httpClientFactory;
        _userBanners = userBanners;
        _fmOptions = fmOptions.Value;
    }

    [HttpGet]
    public async Task<ActionResult<FutureMatchesPayloadDto>> Get(CancellationToken ct)
    {
        var data = await _coordinator.GetCachedAsync(ct).ConfigureAwait(false);
        return Ok(data);
    }

    [HttpPost("refresh")]
    public async Task<ActionResult<FutureMatchesPayloadDto>> Refresh(CancellationToken ct)
    {
        var data = await _coordinator.RefreshAsync(ct).ConfigureAwait(false);
        return Ok(data);
    }

    [HttpGet("page-cache")]
    public ActionResult<IReadOnlyList<FutureMatchesPageCacheEntryDto>> GetPageCache()
    {
        return Ok(_pageCacheStore.ListCachedEntries());
    }

    [HttpPost("page-cache/refetch")]
    public async Task<ActionResult> RefetchPageCache(
        [FromBody] FutureMatchesRefetchPageBody? body,
        CancellationToken ct)
    {
        if (!IsLiquipediaPageRefetchAllowed(body?.Url)) {
            return BadRequest(new { message = "URL must be an https://liquipedia.net/… page." });
        }

        try {
            var http = _httpClientFactory.CreateClient(nameof(FutureMatchesCrawlService));
            await _pageCacheStore.GetOrDownloadAsync(body!.Url!, http, ct, forceRefresh: true).ConfigureAwait(false);
        }
        catch (HttpRequestException ex) {
            return StatusCode(502, new { message = ex.Message });
        }

        return Ok();
    }

    [HttpGet("image-cache")]
    public ActionResult<IReadOnlyList<FutureMatchesImageCacheEntryDto>> GetImageCache()
    {
        return Ok(_imageCache.ListCachedEntries());
    }

    [HttpPost("image-cache/refetch")]
    public async Task<ActionResult<FutureMatchesImageCacheEntryDto>> RefetchImageCache(
        [FromBody] FutureMatchesRefetchImageBody? body,
        CancellationToken ct)
    {
        if (!IsImageRefetchSourceAllowed(body?.SourceUrl)) {
            return BadRequest(new {
                message = "SourceUrl must be an absolute http(s) URL with a host allowed for image refetch.",
            });
        }

        try {
            var updated = await _imageCache.RefetchAsync(body!.SourceUrl!, ct).ConfigureAwait(false);
            return Ok(updated);
        }
        catch (ArgumentException ex) {
            return BadRequest(new { message = ex.Message });
        }
        catch (HttpRequestException ex) {
            return StatusCode(502, new { message = ex.Message });
        }
    }

    private static bool IsLiquipediaPageRefetchAllowed(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) {
            return false;
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u)) {
            return false;
        }

        return u.Scheme == Uri.UriSchemeHttps
            && u.Host.Equals("liquipedia.net", StringComparison.OrdinalIgnoreCase);
    }

    private bool IsImageRefetchSourceAllowed(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) {
            return false;
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u)) {
            return false;
        }

        if (u.Scheme != Uri.UriSchemeHttps && u.Scheme != Uri.UriSchemeHttp) {
            return false;
        }

        var host = u.IdnHost;
        if (string.IsNullOrEmpty(host)) {
            return false;
        }

        foreach (var entry in _fmOptions.ImageRefetchAllowedHosts) {
            if (string.IsNullOrWhiteSpace(entry)) {
                continue;
            }

            var h = entry.Trim().TrimStart('.');
            if (host.Equals(h, StringComparison.OrdinalIgnoreCase)) {
                return true;
            }

            if (host.EndsWith("." + h, StringComparison.OrdinalIgnoreCase)) {
                return true;
            }
        }

        return false;
    }

    [HttpGet("crawl-progress")]
    public ActionResult<FutureMatchesCrawlProgressApiDto> GetCrawlProgress()
    {
        var s = _crawlProgress.GetSnapshot();
        return Ok(new FutureMatchesCrawlProgressApiDto(s.Running, s.CurrentUrl, s.Detail));
    }

    [HttpGet("settings")]
    public async Task<ActionResult<FutureMatchesSettingsApiDto>> GetSettings(CancellationToken ct)
    {
        var data = await _settings.GetForApiAsync(ct).ConfigureAwait(false);
        return Ok(data);
    }

    [HttpPut("settings")]
    public async Task<ActionResult<FutureMatchesSettingsApiDto>> PutSettings(
        [FromBody] FutureMatchesUserSettingsFileDto body,
        CancellationToken ct)
    {
        try {
            var data = await _settings.SaveAsync(body, ct).ConfigureAwait(false);
            return Ok(data);
        }
        catch (ArgumentException ex) {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPost("settings/games/{gameId}/banner")]
    [RequestSizeLimit(FileUploadLimits.DefaultMaxBytes)]
    public async Task<ActionResult<FutureMatchesSettingsApiDto>> UploadGameBanner(
        string gameId,
        IFormFile? file,
        CancellationToken ct)
    {
        if (file == null || file.Length == 0) {
            return BadRequest(new { message = "No file uploaded." });
        }

        if (!FileUploadLimits.IsWithinMaxSize(file.Length)) {
            return BadRequest(new { message = "File too large (max 3 MB)." });
        }

        if (!FutureMatchesUserBannerStore.TryNormalizeGameId(gameId, out var id)) {
            return BadRequest(new { message = "Invalid game id." });
        }

        if (!await _settings.HasGameAsync(id, ct).ConfigureAwait(false)) {
            return NotFound(new { message = "Unknown game." });
        }

        string ext;
        try {
            ext = FutureMatchesUserBannerStore.PickExtensionFromContentType(file.ContentType);
        }
        catch (ArgumentException) {
            return BadRequest(new { message = "Use PNG, JPEG, WebP, or GIF." });
        }

        await using (var stream = file.OpenReadStream())
        await _userBanners.SaveAsync(id, stream, ext, ct).ConfigureAwait(false);

        var data = await _settings.GetForApiAsync(ct).ConfigureAwait(false);
        return Ok(data);
    }

    [HttpDelete("settings/games/{gameId}/banner")]
    public async Task<ActionResult<FutureMatchesSettingsApiDto>> DeleteGameBanner(
        string gameId,
        CancellationToken ct)
    {
        if (!FutureMatchesUserBannerStore.TryNormalizeGameId(gameId, out var id)) {
            return BadRequest(new { message = "Invalid game id." });
        }

        if (!await _settings.HasGameAsync(id, ct).ConfigureAwait(false)) {
            return NotFound(new { message = "Unknown game." });
        }

        _userBanners.DeleteAllForGame(id);
        var data = await _settings.GetForApiAsync(ct).ConfigureAwait(false);
        return Ok(data);
    }

    [HttpGet("user-banners/{gameId}")]
    public IActionResult GetUserBanner(string gameId)
    {
        if (!_userBanners.TryGetPhysicalPath(gameId, out var path, out var fileName)) {
            return NotFound();
        }

        var contentType = FutureMatchesUserBannerStore.GetContentTypeForFileName(fileName);
        return PhysicalFile(path, contentType);
    }

    [HttpGet("media/{fileName}")]
    public IActionResult GetMedia(string fileName)
    {
        if (!_imageCache.TryGetExistingPath(fileName, out var path)) {
            return NotFound();
        }

        var contentType = FutureMatchesImageCache.GetContentType(fileName);
        return PhysicalFile(path, contentType);
    }
}
