using System.Globalization;
using AngleSharp.Html.Parser;
using Microsoft.Extensions.Options;

namespace WkApi.Features.FutureMatches;

public class FutureMatchesCrawlService
{
    private static readonly Dictionary<string, string> GameLabels = new(StringComparer.OrdinalIgnoreCase) {
        ["counterstrike"] = "Counter-Strike",
        ["leagueoflegends"] = "League of Legends",
        ["valorant"] = "Valorant",
        ["rocketleague"] = "Rocket League",
        ["dota2"] = "Dota 2",
        ["starcraft2"] = "StarCraft II",
        ["overwatch"] = "Overwatch",
        ["rainbowsix"] = "Rainbow Six",
        ["pubgmobile"] = "PUBG Mobile",
    };

    private readonly HttpClient _http;
    private readonly IOptions<FutureMatchesOptions> _options;
    private readonly FutureMatchesSettingsService _settings;
    private readonly ILogger<FutureMatchesCrawlService> _logger;

    public FutureMatchesCrawlService(
        HttpClient http,
        IOptions<FutureMatchesOptions> options,
        FutureMatchesSettingsService settings,
        ILogger<FutureMatchesCrawlService> logger)
    {
        _http = http;
        _options = options;
        _settings = settings;
        _logger = logger;
    }

    public async Task<(FutureMatchesPayloadDto Payload, List<string> Errors)> CrawlAsync(
        CancellationToken ct = default)
    {
        var errors = new List<string>();
        var all = new List<FutureMatchItemDto>();
        var opt = _options.Value;
        var delay = Math.Max(0, opt.RequestDelayMs);
        var parser = new HtmlParser();
        var gameConfigs = await _settings.GetGamesForCrawlAsync(ct).ConfigureAwait(false);

        foreach (var game in gameConfigs) {
            if (string.IsNullOrWhiteSpace(game.Id)) {
                continue;
            }

            var gameId = game.Id.Trim();
            var follow = game.FollowTeams ?? [];
            if (follow.Count == 0) {
                errors.Add($"Game '{gameId}': no FollowTeams configured; skipped.");
                continue;
            }

            try {
                var url = $"https://liquipedia.net/{Uri.EscapeDataString(gameId)}/Liquipedia:Matches";
                _logger.LogInformation("Fetching Liquipedia matches: {Url}", url);
                using var response = await _http.GetAsync(url, HttpCompletionOption.ResponseHeadersRead, ct)
                    .ConfigureAwait(false);
                response.EnsureSuccessStatusCode();
                var html = await response.Content.ReadAsStringAsync(ct).ConfigureAwait(false);
                var doc = await parser.ParseDocumentAsync(html, ct).ConfigureAwait(false);
                var label = GameLabels.GetValueOrDefault(gameId, gameId);
                var parsed = ParseDocument(doc, gameId, label, follow);
                all.AddRange(parsed);
            }
            catch (Exception ex) {
                _logger.LogWarning(ex, "Failed to crawl game {GameId}", gameId);
                errors.Add($"{gameId}: {ex.Message}");
            }

            if (delay > 0) {
                await Task.Delay(delay, ct).ConfigureAwait(false);
            }
        }

        all.Sort((a, b) => {
            var da = a.DateUnix ?? long.MaxValue;
            var db = b.DateUnix ?? long.MaxValue;
            return da.CompareTo(db);
        });

        var payload = new FutureMatchesPayloadDto {
            LastUpdatedUtc = DateTime.UtcNow,
            Matches = all,
            RefreshErrors = errors.Count > 0 ? errors : null,
        };

        return (payload, errors);
    }

    private static IReadOnlyList<FutureMatchItemDto> ParseDocument(
        AngleSharp.Dom.IDocument doc,
        string gameId,
        string gameLabel,
        List<string> followTeams)
    {
        var container = doc.QuerySelector("div.toggle-area-content-active");
        if (container == null) {
            return [];
        }

        var list = new List<FutureMatchItemDto>();
        foreach (var node in container.QuerySelectorAll("div.match-info")) {
            var item = ParseMatch(node, gameId, gameLabel, followTeams);
            if (item != null) {
                list.Add(item);
            }
        }

        return list;
    }

    private static FutureMatchItemDto? ParseMatch(
        AngleSharp.Dom.IElement match,
        string gameId,
        string gameLabel,
        List<string> followTeams)
    {
        var tsStr = match.QuerySelector("span.timer-object")?.GetAttribute("data-timestamp");
        long? dateUnix = long.TryParse(tsStr, CultureInfo.InvariantCulture, out var ts) ? ts : null;
        string? dateStr = null;
        if (dateUnix.HasValue) {
            dateStr = DateTimeOffset.FromUnixTimeSeconds(dateUnix.Value).UtcDateTime.ToString(
                "yyyy-MM-dd HH:mm:ss",
                CultureInfo.InvariantCulture);
        }

        var blocks = match.QuerySelectorAll("div.block-team").ToList();
        if (blocks.Count < 2) {
            return null;
        }

        var t1 = ParseTeam(blocks[0]);
        var t2 = ParseTeam(blocks[1]);
        if (t1 == null || t2 == null || string.IsNullOrWhiteSpace(t1.Name) || string.IsNullOrWhiteSpace(t2.Name)) {
            return null;
        }

        if (!IsFollowedTeam(followTeams, t1.Name, t2.Name)) {
            return null;
        }

        var tourLink = match.QuerySelector("span.match-info-tournament-name a");
        var tourName = tourLink?.GetAttribute("title");
        if (string.IsNullOrWhiteSpace(tourName)) {
            tourName = tourLink?.TextContent?.Trim();
        }

        var tournament = new FutureMatchTournamentDto {
            Name = string.IsNullOrWhiteSpace(tourName) ? null : tourName,
            Href = AbsUrl(tourLink?.GetAttribute("href")),
        };

        return new FutureMatchItemDto {
            Game = gameId,
            GameLabel = gameLabel,
            DateUnix = dateUnix,
            DateStr = dateStr,
            Team1 = t1,
            Team2 = t2,
            Tournament = tournament,
        };
    }

    private static FutureMatchTeamDto? ParseTeam(AngleSharp.Dom.IElement block)
    {
        var link = block.QuerySelector("span.name a");
        var name = link?.GetAttribute("title");
        if (string.IsNullOrWhiteSpace(name)) {
            name = link?.TextContent?.Trim();
        }

        if (string.IsNullOrWhiteSpace(name)) {
            return null;
        }

        var iconSrc = block.QuerySelector("span.team-template-darkmode img")?.GetAttribute("src")
            ?? block.QuerySelector("span.team-template-image-icon img")?.GetAttribute("src");

        return new FutureMatchTeamDto {
            Name = name.Trim(),
            Href = AbsUrl(link?.GetAttribute("href")),
            Icon = AbsUrl(iconSrc),
        };
    }

    private static bool IsFollowedTeam(List<string> followed, string name1, string name2)
    {
        var a = name1.ToLowerInvariant();
        var b = name2.ToLowerInvariant();
        foreach (var raw in followed) {
            if (string.IsNullOrWhiteSpace(raw)) {
                continue;
            }

            var t = raw.Trim().ToLowerInvariant();
            if (a.Contains(t, StringComparison.Ordinal) || b.Contains(t, StringComparison.Ordinal)) {
                return true;
            }
        }

        return false;
    }

    private static string? AbsUrl(string? href)
    {
        if (string.IsNullOrWhiteSpace(href)) {
            return null;
        }

        href = href.Trim();
        if (href.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
            return href;
        }

        return "https://liquipedia.net" + (href.StartsWith('/') ? href : "/" + href);
    }
}
