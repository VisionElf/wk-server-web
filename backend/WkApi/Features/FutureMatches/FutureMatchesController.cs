using Microsoft.AspNetCore.Mvc;

namespace WkApi.Features.FutureMatches;

[ApiController]
[Route("api/future-matches")]
public class FutureMatchesController : ControllerBase
{
    private readonly FutureMatchesCoordinator _coordinator;
    private readonly FutureMatchesImageCache _imageCache;

    public FutureMatchesController(
        FutureMatchesCoordinator coordinator,
        FutureMatchesImageCache imageCache)
    {
        _coordinator = coordinator;
        _imageCache = imageCache;
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
