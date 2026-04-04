namespace WkApi.Features.FutureMatches;

public class FutureMatchesCoordinator
{
    private readonly FutureMatchesCacheStore _store;
    private readonly FutureMatchesCrawlService _crawl;
    private readonly FutureMatchesImageCache _images;
    private readonly FutureMatchesCrawlProgress _crawlProgress;

    public FutureMatchesCoordinator(
        FutureMatchesCacheStore store,
        FutureMatchesCrawlService crawl,
        FutureMatchesImageCache images,
        FutureMatchesCrawlProgress crawlProgress)
    {
        _store = store;
        _crawl = crawl;
        _images = images;
        _crawlProgress = crawlProgress;
    }

    public async Task<FutureMatchesPayloadDto> GetCachedAsync(CancellationToken ct = default)
    {
        var cached = await _store.ReadAsync(ct).ConfigureAwait(false);
        var payload = cached ?? new FutureMatchesPayloadDto { Matches = [] };
        payload.GameVisuals ??= [];
        var dirty = await _images.MaterializeGameVisualsAsync(payload, ct).ConfigureAwait(false);
        if (payload.Matches.Count > 0) {
            dirty |= await _images.MaterializeMatchIconsAsync(payload, ct).ConfigureAwait(false);
        }

        if (dirty) {
            await _store.WriteAsync(payload, ct).ConfigureAwait(false);
        }

        return payload;
    }

    public async Task<FutureMatchesPayloadDto> RefreshAsync(CancellationToken ct = default)
    {
        _crawlProgress.BeginCrawl();
        try {
            var (payload, errors) = await _crawl.CrawlAsync(ct).ConfigureAwait(false);
            payload.GameVisuals ??= [];
            _crawlProgress.SetCurrentUrl(null);
            _crawlProgress.SetDetail("Caching wiki banners & logos…");
            await _images.MaterializeGameVisualsAsync(payload, ct).ConfigureAwait(false);
            _crawlProgress.SetDetail("Caching match images…");
            await _images.MaterializeMatchIconsAsync(payload, ct).ConfigureAwait(false);
            var toStore = new FutureMatchesPayloadDto {
                LastUpdatedUtc = payload.LastUpdatedUtc,
                Matches = payload.Matches,
                GameVisuals = payload.GameVisuals,
            };
            await _store.WriteAsync(toStore, ct).ConfigureAwait(false);

            return new FutureMatchesPayloadDto {
                LastUpdatedUtc = toStore.LastUpdatedUtc,
                Matches = toStore.Matches,
                GameVisuals = toStore.GameVisuals,
                RefreshErrors = errors.Count > 0 ? errors : null,
            };
        }
        finally {
            _crawlProgress.EndCrawl();
        }
    }
}
