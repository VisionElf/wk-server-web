namespace WkApi.Features.FutureMatches;

public class FutureMatchesOptions
{
    public const string SectionName = "FutureMatches";

    /// <summary>Relative to content root (e.g. Data/Cache/future-matches.json).</summary>
    public string CacheFileRelativePath { get; set; } = "Data/Cache/future-matches.json";

    /// <summary>Delay between Liquipedia requests per game (politeness).</summary>
    public int RequestDelayMs { get; set; } = 750;

    public List<FutureMatchesGameOptions> Games { get; set; } = [];
}

public class FutureMatchesGameOptions
{
    /// <summary>Liquipedia wiki id: counterstrike, leagueoflegends, valorant, rocketleague.</summary>
    public string Id { get; set; } = "";

    /// <summary>Substring match (case-insensitive) against team names on the match row.</summary>
    public List<string> FollowTeams { get; set; } = [];
}
