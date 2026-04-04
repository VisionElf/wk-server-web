using System.Net.Http;
using Microsoft.AspNetCore.Mvc;

namespace WkApi.Features.FutureMatches;

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

    public FutureMatchesController(
        FutureMatchesCoordinator coordinator,
        FutureMatchesImageCache imageCache,
        FutureMatchesSettingsService settings,
        FutureMatchesPageCacheStore pageCacheStore,
        FutureMatchesCrawlProgress crawlProgress,
        IHttpClientFactory httpClientFactory)
    {
        _coordinator = coordinator;
        _imageCache = imageCache;
        _settings = settings;
        _pageCacheStore = pageCacheStore;
        _crawlProgress = crawlProgress;
        _httpClientFactory = httpClientFactory;
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
            return BadRequest(new { message = "SourceUrl must be an absolute http(s) URL." });
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

    private static bool IsImageRefetchSourceAllowed(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) {
            return false;
        }

        if (!Uri.TryCreate(url.Trim(), UriKind.Absolute, out var u)) {
            return false;
        }

        return (u.Scheme == Uri.UriSchemeHttps || u.Scheme == Uri.UriSchemeHttp)
            && u.Host.Length > 0;
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
