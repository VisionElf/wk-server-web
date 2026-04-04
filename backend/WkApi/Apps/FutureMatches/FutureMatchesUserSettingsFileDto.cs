namespace WkApi.Apps.FutureMatches;

/// <summary>Serialized user settings for followed games/teams (JSON file).</summary>
public class FutureMatchesUserSettingsFileDto
{
    public List<FutureMatchesGameOptions> Games { get; set; } = [];
}
