using System.Globalization;
using System.Net;
using System.Text.RegularExpressions;
using AngleSharp.Dom;

namespace WkApi.Features.FutureMatches;

public static class FutureMatchesLiquipediaParsers
{
    public static List<FutureMatchItemDto> DedupeMatches(List<FutureMatchItemDto> matches)
    {
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var list = new List<FutureMatchItemDto>();
        foreach (var m in matches) {
            var key = MatchDedupeKey(m);
            if (seen.Add(key)) {
                list.Add(m);
            }
        }

        return list;
    }

    private static string MatchDedupeKey(FutureMatchItemDto m)
    {
        var a = SlugFromTeamHref(m.Team1?.Href) ?? "";
        var b = SlugFromTeamHref(m.Team2?.Href) ?? "";
        if (string.Compare(a, b, StringComparison.OrdinalIgnoreCase) > 0) {
            (a, b) = (b, a);
        }

        return $"{m.Game}|{m.DateUnix}|{a.ToLowerInvariant()}|{b.ToLowerInvariant()}";
    }

    public static IReadOnlyList<FutureMatchItemDto> ParseHubMatchesDocument(
        IDocument doc,
        string gameId,
        string gameLabel,
        List<string> followTeamIds)
    {
        var container = doc.QuerySelector("div.toggle-area-content-active");
        if (container == null) {
            return [];
        }

        var list = new List<FutureMatchItemDto>();
        foreach (var node in container.QuerySelectorAll("div.match-info")) {
            var item = ParseHubMatchInfo(node, gameId, gameLabel, followTeamIds);
            if (item != null) {
                list.Add(item);
            }
        }

        return list;
    }

    private static FutureMatchItemDto? ParseHubMatchInfo(
        IElement match,
        string gameId,
        string gameLabel,
        List<string> followTeamIds)
    {
        var tsStr = match.QuerySelector("span.timer-object")?.GetAttribute("data-timestamp");
        long? dateUnix = long.TryParse(tsStr, CultureInfo.InvariantCulture, out var ts) ? ts : null;
        var dateStr = FormatDateStr(dateUnix);

        var blocks = match.QuerySelectorAll("div.block-team").ToList();
        if (blocks.Count < 2) {
            return null;
        }

        var t1 = ParseHubBlockTeam(blocks[0]);
        var t2 = ParseHubBlockTeam(blocks[1]);
        if (t1 == null || t2 == null || string.IsNullOrWhiteSpace(t1.Name) || string.IsNullOrWhiteSpace(t2.Name)) {
            return null;
        }

        if (!MatchInvolvesFollowedTeam(followTeamIds, t1, t2)) {
            return null;
        }

        return BuildMatchItem(gameId, gameLabel, dateUnix, dateStr, t1, t2, match);
    }

    public static IReadOnlyList<FutureMatchItemDto> ParseTeamCarouselDocument(
        IDocument doc,
        string gameId,
        string gameLabel,
        List<string> followTeamIds)
    {
        var items = doc.QuerySelectorAll("div.carousel-content div.carousel-item").ToList();
        if (items.Count == 0) {
            items = doc.QuerySelectorAll("div.carousel-item").ToList();
        }

        var list = new List<FutureMatchItemDto>();
        foreach (var node in items) {
            var item = ParseCarouselItem(node, gameId, gameLabel, followTeamIds);
            if (item != null) {
                list.Add(item);
            }
        }

        return list;
    }

    private static FutureMatchItemDto? ParseCarouselItem(
        IElement carouselItem,
        string gameId,
        string gameLabel,
        List<string> followTeamIds)
    {
        var tsStr = carouselItem.QuerySelector("span.timer-object")?.GetAttribute("data-timestamp");
        long? dateUnix = long.TryParse(tsStr, CultureInfo.InvariantCulture, out var ts) ? ts : null;
        var dateStr = FormatDateStr(dateUnix);

        var rows = carouselItem.QuerySelectorAll("div.match-info-opponent-row").ToList();
        if (rows.Count < 2) {
            return null;
        }

        var t1 = ParseTeamFromOpponentRow(rows[0]);
        var t2 = ParseTeamFromOpponentRow(rows[1]);
        if (t1 == null || t2 == null || string.IsNullOrWhiteSpace(t1.Name) || string.IsNullOrWhiteSpace(t2.Name)) {
            return null;
        }

        if (!MatchInvolvesFollowedTeam(followTeamIds, t1, t2)) {
            return null;
        }

        return BuildMatchItem(gameId, gameLabel, dateUnix, dateStr, t1, t2, carouselItem);
    }

    private static FutureMatchItemDto BuildMatchItem(
        string gameId,
        string gameLabel,
        long? dateUnix,
        string? dateStr,
        FutureMatchTeamDto t1,
        FutureMatchTeamDto t2,
        IElement matchRoot)
    {
        var tourLink = matchRoot.QuerySelector("span.match-info-tournament-name a");
        var tourName = tourLink?.GetAttribute("title");
        if (string.IsNullOrWhiteSpace(tourName)) {
            tourName = tourLink?.TextContent?.Trim();
        }

        var tournament = new FutureMatchTournamentDto {
            Name = string.IsNullOrWhiteSpace(tourName) ? null : tourName,
            Href = AbsUrl(tourLink?.GetAttribute("href")),
        };

        return new FutureMatchItemDto {
            Kind = "match",
            Game = gameId,
            GameLabel = gameLabel,
            DateUnix = dateUnix,
            DateStr = dateStr,
            Team1 = t1,
            Team2 = t2,
            Tournament = tournament,
        };
    }

    private static string? FormatDateStr(long? dateUnix)
    {
        if (!dateUnix.HasValue) {
            return null;
        }

        return DateTimeOffset.FromUnixTimeSeconds(dateUnix.Value).UtcDateTime.ToString(
            "yyyy-MM-dd HH:mm:ss",
            CultureInfo.InvariantCulture);
    }

    private static FutureMatchTeamDto? ParseHubBlockTeam(IElement block)
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

    private static FutureMatchTeamDto? ParseTeamFromOpponentRow(IElement row)
    {
        var wrap = row.QuerySelector("span.team-template-darkmode")
            ?? row.QuerySelector("span.team-template-image-icon");
        if (wrap == null) {
            return null;
        }

        var link = wrap.QuerySelector("a[href]");
        var name = link?.GetAttribute("title");
        if (string.IsNullOrWhiteSpace(name)) {
            name = link?.TextContent?.Trim();
        }

        if (string.IsNullOrWhiteSpace(name)) {
            return null;
        }

        var iconSrc = wrap.QuerySelector("img")?.GetAttribute("src");

        return new FutureMatchTeamDto {
            Name = name.Trim(),
            Href = AbsUrl(link?.GetAttribute("href")),
            Icon = AbsUrl(iconSrc),
        };
    }

    private static bool MatchInvolvesFollowedTeam(
        List<string> followTeamIds,
        FutureMatchTeamDto? t1,
        FutureMatchTeamDto? t2)
    {
        var s1 = SlugFromTeamHref(t1?.Href);
        var s2 = SlugFromTeamHref(t2?.Href);
        foreach (var id in followTeamIds) {
            if (string.IsNullOrWhiteSpace(id)) {
                continue;
            }

            var raw = id.Trim();
            if (SlugEquals(s1, raw) || SlugEquals(s2, raw)) {
                return true;
            }
        }

        return false;
    }

    private static bool SlugEquals(string? slugFromHref, string configuredId) =>
        slugFromHref != null
        && string.Equals(slugFromHref, configuredId.Trim(), StringComparison.OrdinalIgnoreCase);

    private static string? SlugFromTeamHref(string? href)
    {
        if (string.IsNullOrWhiteSpace(href)) {
            return null;
        }

        try {
            var u = new Uri(href);
            var parts = u.AbsolutePath.Split('/', StringSplitOptions.RemoveEmptyEntries);
            if (parts.Length == 0) {
                return null;
            }

            var last = parts[^1];
            if (last.Contains('?', StringComparison.Ordinal)) {
                last = last[..last.IndexOf('?', StringComparison.Ordinal)];
            }

            return string.IsNullOrEmpty(last) ? null : Uri.UnescapeDataString(last);
        }
        catch {
            return null;
        }
    }

    public static string? AbsUrl(string? href)
    {
        if (string.IsNullOrWhiteSpace(href)) {
            return null;
        }

        href = href.Trim();
        if (href.StartsWith("//", StringComparison.Ordinal)) {
            return "https:" + href;
        }

        if (href.StartsWith("http://", StringComparison.OrdinalIgnoreCase)
            || href.StartsWith("https://", StringComparison.OrdinalIgnoreCase)) {
            return href;
        }

        return "https://liquipedia.net" + (href.StartsWith('/') ? href : "/" + href);
    }

    public static string? NormalizeAssetUrl(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) {
            return null;
        }

        return WebUtility.HtmlDecode(raw.Trim());
    }

    private static void RememberTournamentRows(
        Dictionary<string, Dictionary<string, List<FutureMatchItemDto>>> store,
        string gameId,
        string teamSlug,
        List<FutureMatchItemDto> rows)
    {
        if (rows.Count == 0) {
            return;
        }

        if (!store.TryGetValue(gameId, out var byTeam)) {
            byTeam = new Dictionary<string, List<FutureMatchItemDto>>(StringComparer.OrdinalIgnoreCase);
            store[gameId] = byTeam;
        }

        byTeam[teamSlug] = rows;
    }

    public static List<FutureMatchItemDto> MergeMatchesAndIdleTeamTournaments(
        List<FutureMatchItemDto> dedupedMatches,
        Dictionary<string, Dictionary<string, List<FutureMatchItemDto>>> tournamentRowsByGameAndTeam,
        IReadOnlyList<FutureMatchesGameOptions> gameConfigs)
    {
        var result = new List<FutureMatchItemDto>(dedupedMatches);
        var seenTourKeys = new HashSet<string>(StringComparer.Ordinal);

        foreach (var game in gameConfigs) {
            var gid = game.Id?.Trim();
            if (string.IsNullOrEmpty(gid)) {
                continue;
            }

            foreach (var teamId in game.FollowTeamIds ?? []) {
                if (string.IsNullOrWhiteSpace(teamId)) {
                    continue;
                }

                var t = teamId.Trim();
                if (TeamHasMatchInGame(dedupedMatches, gid, t)) {
                    continue;
                }

                if (!tournamentRowsByGameAndTeam.TryGetValue(gid, out var byTeam)) {
                    continue;
                }

                if (!byTeam.TryGetValue(t, out var rows)) {
                    continue;
                }

                foreach (var row in rows) {
                    var dk = TournamentRowDedupeKey(row);
                    if (!seenTourKeys.Add(dk)) {
                        continue;
                    }

                    result.Add(row);
                }
            }
        }

        return result;
    }

    private static bool TeamHasMatchInGame(
        List<FutureMatchItemDto> matches,
        string gameId,
        string teamPageId)
    {
        var oneTeam = new List<string> { teamPageId };
        foreach (var m in matches) {
            if (IsTournamentRow(m)) {
                continue;
            }

            if (!string.Equals(m.Game, gameId, StringComparison.OrdinalIgnoreCase)) {
                continue;
            }

            if (MatchInvolvesFollowedTeam(oneTeam, m.Team1, m.Team2)) {
                return true;
            }
        }

        return false;
    }

    private static bool IsTournamentRow(FutureMatchItemDto m) =>
        string.Equals(m.Kind, "tournament", StringComparison.OrdinalIgnoreCase);

    private static string TournamentRowDedupeKey(FutureMatchItemDto m)
    {
        var team = SlugFromTeamHref(m.Team1?.Href) ?? "";
        var href = m.Tournament?.Href ?? "";
        return $"{m.Game}|{team.ToLowerInvariant()}|{href}";
    }

    public static void SortMatchPayloadRows(List<FutureMatchItemDto> rows)
    {
        rows.Sort((a, b) => {
            var da = a.DateUnix ?? long.MaxValue;
            var db = b.DateUnix ?? long.MaxValue;
            var cmp = da.CompareTo(db);
            if (cmp != 0) {
                return cmp;
            }

            var ka = IsTournamentRow(a) ? 1 : 0;
            var kb = IsTournamentRow(b) ? 1 : 0;
            if (ka != kb) {
                return ka.CompareTo(kb);
            }

            return string.Compare(
                a.Tournament?.Name ?? a.Team1?.Name,
                b.Tournament?.Name ?? b.Team1?.Name,
                StringComparison.OrdinalIgnoreCase);
        });
    }

    public static FutureMatchTeamDto? TryBuildSourceTeamFromTeamPage(
        IDocument doc,
        string gameId,
        string teamSlug)
    {
        var infobox = doc.QuerySelector(".fo-nttax-infobox") ?? doc.QuerySelector(".infobox");
        if (infobox == null) {
            return null;
        }

        var header = infobox.QuerySelector(".infobox-header");
        var rawName = header?.TextContent;
        if (!string.IsNullOrWhiteSpace(rawName)) {
            rawName = Regex.Replace(rawName, @"\[[^\]]*\]", " ").Trim();
            rawName = string.Join(" ", rawName.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
        }

        if (string.IsNullOrWhiteSpace(rawName)) {
            rawName = teamSlug.Replace('_', ' ');
        }

        var iconSrc = infobox.QuerySelector(".infobox-image-wrapper img")?.GetAttribute("src");

        return new FutureMatchTeamDto {
            Name = rawName,
            Href = AbsUrl($"/{gameId}/{teamSlug}"),
            Icon = AbsUrl(iconSrc),
        };
    }

    public static List<FutureMatchItemDto> ParseUpcomingTournamentsSection(
        IDocument doc,
        string gameId,
        string gameLabel,
        FutureMatchTeamDto sourceTeam)
    {
        var list = new List<FutureMatchItemDto>();
        var items = doc.QuerySelectorAll("div.tournaments-list-type-list div.tournaments-list-item");
        foreach (var el in items) {
            var nameCell = el.QuerySelector("div.tournaments-list-item__name")
                ?? el.QuerySelector("[class*='tournaments-list-item__name']");
            var nameA = nameCell?.QuerySelector("a[href]");
            if (nameA == null) {
                continue;
            }

            var href = nameA.GetAttribute("href");
            var name = nameA.GetAttribute("title");
            if (string.IsNullOrWhiteSpace(name)) {
                name = nameA.TextContent?.Trim();
            }

            if (string.IsNullOrWhiteSpace(name)) {
                continue;
            }

            var dateEl = el.QuerySelector("div.tournaments-list-item__date")
                ?? el.QuerySelector("[class*='tournaments-list-item__date']");
            var dateText = dateEl?.TextContent?.Trim();

            list.Add(new FutureMatchItemDto {
                Kind = "tournament",
                Game = gameId,
                GameLabel = gameLabel,
                DateUnix = null,
                DateStr = string.IsNullOrWhiteSpace(dateText) ? null : dateText,
                Team1 = sourceTeam,
                Team2 = null,
                Tournament = new FutureMatchTournamentDto {
                    Name = name.Trim(),
                    Href = AbsUrl(href),
                },
            });
        }

        return list;
    }

    public static void RememberTournamentRowsForTeam(
        Dictionary<string, Dictionary<string, List<FutureMatchItemDto>>> store,
        string gameId,
        string teamSlug,
        List<FutureMatchItemDto> rows)
    {
        RememberTournamentRows(store, gameId, teamSlug, rows);
    }
}
