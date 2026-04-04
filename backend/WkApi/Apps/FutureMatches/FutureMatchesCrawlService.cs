using AngleSharp.Html.Parser;
using Microsoft.Extensions.Options;
using WkApi.Apps.FutureMatches.Crawler.Liquipedia;

namespace WkApi.Apps.FutureMatches;

public class FutureMatchesCrawlService
{
    private readonly HttpClient _http;
    private readonly FutureMatchesPageCacheStore _pageCache;
    private readonly FutureMatchesCrawlProgress _crawlProgress;
    private readonly IOptions<FutureMatchesOptions> _options;
    private readonly FutureMatchesSettingsService _settings;
    private readonly ILogger<FutureMatchesCrawlService> _logger;
    private readonly LiquipediaWikiVisualsExtractor _visuals;

    public FutureMatchesCrawlService(
        HttpClient http,
        FutureMatchesPageCacheStore pageCache,
        FutureMatchesCrawlProgress crawlProgress,
        IOptions<FutureMatchesOptions> options,
        FutureMatchesSettingsService settings,
        ILogger<FutureMatchesCrawlService> logger)
    {
        _http = http;
        _pageCache = pageCache;
        _crawlProgress = crawlProgress;
        _options = options;
        _settings = settings;
        _logger = logger;
        _visuals = new LiquipediaWikiVisualsExtractor(http, logger);
    }

    public async Task<(FutureMatchesPayloadDto Payload, List<string> Errors)> CrawlAsync(
        CancellationToken ct = default)
    {
        var errors = new List<string>();
        var all = new List<FutureMatchItemDto>();
        var tournamentRowsByGameAndTeam =
            new Dictionary<string, Dictionary<string, List<FutureMatchItemDto>>>(StringComparer.OrdinalIgnoreCase);
        var opt = _options.Value;
        var delay = Math.Max(0, opt.RequestDelayMs);
        var parser = new HtmlParser();
        var gameConfigs = await _settings.GetGamesForCrawlAsync(ct).ConfigureAwait(false);
        var gameVisualsById = new Dictionary<string, FutureMatchesGameVisualDto>(StringComparer.OrdinalIgnoreCase);
        var pendingNetworkDelay = false;

        async Task<string> ReadLiquipediaPageAsync(string url, CancellationToken c)
        {
            if (pendingNetworkDelay && delay > 0) {
                await Task.Delay(delay, c).ConfigureAwait(false);
            }

            _crawlProgress.SetDetail(null);
            _crawlProgress.SetCurrentUrl(url);
            var (html, fromNetwork) = await _pageCache.GetOrDownloadAsync(url, _http, c).ConfigureAwait(false);
            pendingNetworkDelay = fromNetwork;
            return html;
        }

        foreach (var game in gameConfigs) {
            if (string.IsNullOrWhiteSpace(game.Id)) {
                continue;
            }

            var gameId = game.Id.Trim();
            var followIds = game.FollowTeamIds ?? [];
            if (followIds.Count == 0) {
                errors.Add($"Game '{gameId}': no followTeamIds configured; skipped.");
                continue;
            }

            var label = KnownLiquipediaWikiGameLabels.GetLabelOrId(gameId);

            try {
                var mainUrl = LiquipediaWikiUrls.MainPage(gameId);
                _logger.LogInformation("Liquipedia Main_Page (visuals): {Url}", mainUrl);
                var mainHtml = await ReadLiquipediaPageAsync(mainUrl, ct).ConfigureAwait(false);
                var mainDoc = await parser.ParseDocumentAsync(mainHtml, ct).ConfigureAwait(false);
                var (logoRaw, bannerRaw) = await _visuals.ExtractWikiMainPageVisualsAsync(mainDoc, mainUrl, ct)
                    .ConfigureAwait(false);
                gameVisualsById[gameId] = new FutureMatchesGameVisualDto {
                    Game = gameId,
                    GameLabel = label,
                    Logo = LiquipediaHtmlParsers.AbsUrl(LiquipediaHtmlParsers.NormalizeAssetUrl(logoRaw)),
                    Banner = LiquipediaHtmlParsers.AbsUrl(LiquipediaHtmlParsers.NormalizeAssetUrl(bannerRaw)),
                };
            }
            catch (Exception ex) {
                _logger.LogWarning(ex, "Failed to read Main_Page visuals for {GameId}", gameId);
                gameVisualsById[gameId] = new FutureMatchesGameVisualDto {
                    Game = gameId,
                    GameLabel = label,
                };
                pendingNetworkDelay = false;
            }

            try {
                var hubUrl = LiquipediaWikiUrls.MatchesHub(gameId);
                _logger.LogInformation("Liquipedia hub: {Url}", hubUrl);
                var hubHtml = await ReadLiquipediaPageAsync(hubUrl, ct).ConfigureAwait(false);
                var hubDoc = await parser.ParseDocumentAsync(hubHtml, ct).ConfigureAwait(false);
                all.AddRange(LiquipediaHtmlParsers.ParseHubMatchesDocument(hubDoc, gameId, label, followIds));
            }
            catch (Exception ex) {
                _logger.LogWarning(ex, "Failed to crawl hub for {GameId}", gameId);
                errors.Add($"{gameId} (hub): {ex.Message}");
                pendingNetworkDelay = false;
            }

            foreach (var teamId in followIds) {
                if (string.IsNullOrWhiteSpace(teamId)) {
                    continue;
                }

                var slug = teamId.Trim();
                try {
                    var teamUrl = LiquipediaWikiUrls.TeamPage(gameId, slug);
                    _logger.LogInformation("Liquipedia team page: {Url}", teamUrl);
                    var teamHtml = await ReadLiquipediaPageAsync(teamUrl, ct).ConfigureAwait(false);
                    var teamDoc = await parser.ParseDocumentAsync(teamHtml, ct).ConfigureAwait(false);
                    all.AddRange(LiquipediaHtmlParsers.ParseTeamCarouselDocument(teamDoc, gameId, label, followIds));

                    var sourceTeam = LiquipediaHtmlParsers.TryBuildSourceTeamFromTeamPage(teamDoc, gameId, slug)
                        ?? new FutureMatchTeamDto {
                            Name = slug.Replace('_', ' '),
                            Href = LiquipediaHtmlParsers.AbsUrl($"/{gameId}/{slug}"),
                        };
                    var tourRows = LiquipediaHtmlParsers.ParseUpcomingTournamentsSection(teamDoc, gameId, label, sourceTeam);
                    LiquipediaHtmlParsers.RememberTournamentRowsForTeam(
                        tournamentRowsByGameAndTeam, gameId, slug, tourRows);
                }
                catch (Exception ex) {
                    _logger.LogWarning(ex, "Failed to crawl team page {Slug} ({GameId})", slug, gameId);
                    errors.Add($"{gameId}/{slug}: {ex.Message}");
                    pendingNetworkDelay = false;
                }
            }
        }

        var deduped = LiquipediaHtmlParsers.DedupeMatches(all);
        var merged = LiquipediaHtmlParsers.MergeMatchesAndIdleTeamTournaments(
            deduped, tournamentRowsByGameAndTeam, gameConfigs);
        LiquipediaHtmlParsers.SortMatchPayloadRows(merged);

        var payload = new FutureMatchesPayloadDto {
            LastUpdatedUtc = DateTime.UtcNow,
            Matches = merged,
            GameVisuals = gameVisualsById.Values
                .OrderBy(x => x.Game, StringComparer.OrdinalIgnoreCase)
                .ToList(),
            RefreshErrors = errors.Count > 0 ? errors : null,
        };

        return (payload, errors);
    }
}
