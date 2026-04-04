namespace WkApi.Features.FutureMatches;

public static class FutureMatchesLiquipediaUrls
{
    public static string MainPage(string gameId) =>
        $"https://liquipedia.net/{Uri.EscapeDataString(gameId)}/Main_Page";

    public static string MatchesHub(string gameId) =>
        $"https://liquipedia.net/{Uri.EscapeDataString(gameId)}/Liquipedia:Matches";

    public static string TeamPage(string gameId, string teamSlug) =>
        $"https://liquipedia.net/{Uri.EscapeDataString(gameId)}/{Uri.EscapeDataString(teamSlug)}";
}
