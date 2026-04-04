namespace WkApi.Features.FutureMatches;

public class FutureMatchesPayloadDto
{
    public DateTime? LastUpdatedUtc { get; set; }
    public List<FutureMatchItemDto> Matches { get; set; } = [];
    public List<FutureMatchesGameVisualDto> GameVisuals { get; set; } = [];
    public List<string>? RefreshErrors { get; set; }
}

/// <summary>Wiki logo + header banner from Main_Page (URLs materialized to /api/future-matches/media/…).</summary>
public class FutureMatchesGameVisualDto
{
    public string Game { get; set; } = "";
    public string GameLabel { get; set; } = "";
    public string? Logo { get; set; }
    public string? Banner { get; set; }
}

public class FutureMatchItemDto
{
    /// <summary><c>match</c> (default) or <c>tournament</c> (upcoming event row when team has no parsed matches).</summary>
    public string Kind { get; set; } = "match";

    public string Game { get; set; } = "";
    public string GameLabel { get; set; } = "";
    public long? DateUnix { get; set; }
    public string? DateStr { get; set; }
    public FutureMatchTeamDto? Team1 { get; set; }
    public FutureMatchTeamDto? Team2 { get; set; }
    public FutureMatchTournamentDto? Tournament { get; set; }
}

public class FutureMatchTeamDto
{
    public string Name { get; set; } = "";
    public string? Href { get; set; }
    public string? Icon { get; set; }
}

public class FutureMatchTournamentDto
{
    public string? Name { get; set; }
    public string? Href { get; set; }
}

public record FutureMatchesPageCacheEntryDto(string Url, DateTime FetchedAtUtc, DateTime ExpiresAtUtc);

public record FutureMatchesCrawlProgressApiDto(bool Running, string? CurrentUrl, string? Detail);
