using Microsoft.AspNetCore.Mvc;

namespace WkApi.Features.FutureMatches;

[ApiController]
[Route("api/future-matches")]
public class FutureMatchesController : ControllerBase
{
    private readonly FutureMatchesCoordinator _coordinator;
    private readonly FutureMatchesImageCache _imageCache;
    private readonly FutureMatchesSettingsService _settings;

    public FutureMatchesController(
        FutureMatchesCoordinator coordinator,
        FutureMatchesImageCache imageCache,
        FutureMatchesSettingsService settings)
    {
        _coordinator = coordinator;
        _imageCache = imageCache;
        _settings = settings;
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
