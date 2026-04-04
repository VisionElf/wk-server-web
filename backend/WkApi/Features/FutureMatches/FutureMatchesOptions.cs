using System.Text.Json.Serialization;

namespace WkApi.Features.FutureMatches;

public class FutureMatchesOptions
{
    public const string SectionName = "FutureMatches";

    /// <summary>Relative to content root (e.g. Data/Cache/future-matches.json).</summary>
    public string CacheFileRelativePath { get; set; } = "Data/Cache/future-matches.json";

    /// <summary>User-editable games/teams (seeded from appsettings on first run).</summary>
    public string SettingsFileRelativePath { get; set; } = "Data/Cache/future-matches-settings.json";

    /// <summary>Raw HTML cache directory (per-URL files, 24h TTL by default).</summary>
    public string HtmlPageCacheDirectoryRelativePath { get; set; } = "Data/Cache/future-matches-page-cache";

    /// <summary>How long cached Liquipedia HTML is reused before refetching.</summary>
    public double HtmlPageCacheTtlHours { get; set; } = 24;

    /// <summary>Delay between Liquipedia page fetches (politeness).</summary>
    public int RequestDelayMs { get; set; } = 2000;

    /// <summary>
    /// Hostnames allowed for manual image refetch (SSRF mitigation). Subdomains match (e.g. images.liquipedia.net when liquipedia.net is listed).
    /// </summary>
    public List<string> ImageRefetchAllowedHosts { get; set; } =
    [
        "liquipedia.net",
        "static.wikia.nocookie.net",
        "upload.wikimedia.org",
    ];

    public List<FutureMatchesGameOptions> Games { get; set; } = [];
}

public class FutureMatchesGameOptions
{
    /// <summary>Liquipedia wiki id: counterstrike, leagueoflegends, valorant, rocketleague.</summary>
    public string Id { get; set; } = "";

    /// <summary>Liquipedia team page titles (URL segments), e.g. Team_Vitality, Karmine_Corp.</summary>
    public List<string> FollowTeamIds { get; set; } = [];

    /// <summary>Legacy settings key; migrated to FollowTeamIds on read when FollowTeamIds is empty.</summary>
    [JsonPropertyName("followTeams")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
    public List<string>? FollowTeams { get; set; }
}
