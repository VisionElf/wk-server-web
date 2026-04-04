namespace WkApi.Apps.FutureMatches.Crawler.Liquipedia;

/// <summary>Canonical Liquipedia wiki id → display label (shared by settings and crawl).</summary>
public static class KnownLiquipediaWikiGameLabels
{
    private static readonly Dictionary<string, string> ById = new(StringComparer.OrdinalIgnoreCase) {
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

    public static string GetLabelOrId(string gameId) => ById.GetValueOrDefault(gameId, gameId);

    public static IReadOnlyDictionary<string, string> All => ById;
}
