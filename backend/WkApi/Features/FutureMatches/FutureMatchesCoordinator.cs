namespace WkApi.Features.FutureMatches;

public class FutureMatchesCoordinator
{
    private readonly FutureMatchesCacheStore _store;
    private readonly FutureMatchesCrawlService _crawl;
    private readonly FutureMatchesImageCache _images;

    public FutureMatchesCoordinator(
        FutureMatchesCacheStore store,
        FutureMatchesCrawlService crawl,
        FutureMatchesImageCache images)
    {
        _store = store;
        _crawl = crawl;
        _images = images;
    }

    public async Task<FutureMatchesPayloadDto> GetCachedAsync(CancellationToken ct = default)
    {
        var cached = await _store.ReadAsync(ct).ConfigureAwait(false);
        var payload = cached ?? new FutureMatchesPayloadDto { Matches = [] };
        if (payload.Matches.Count > 0) {
            var dirty = await _images.MaterializeMatchIconsAsync(payload, ct).ConfigureAwait(false);
            if (dirty) {
                await _store.WriteAsync(payload, ct).ConfigureAwait(false);
            }
        }

        return payload;
    }

    public async Task<FutureMatchesPayloadDto> RefreshAsync(CancellationToken ct = default)
    {
        var (payload, errors) = await _crawl.CrawlAsync(ct).ConfigureAwait(false);
        await _images.MaterializeMatchIconsAsync(payload, ct).ConfigureAwait(false);
        var toStore = new FutureMatchesPayloadDto {
            LastUpdatedUtc = payload.LastUpdatedUtc,
            Matches = payload.Matches,
        };
        await _store.WriteAsync(toStore, ct).ConfigureAwait(false);

        return new FutureMatchesPayloadDto {
            LastUpdatedUtc = toStore.LastUpdatedUtc,
            Matches = toStore.Matches,
            RefreshErrors = errors.Count > 0 ? errors : null,
        };
    }
}
