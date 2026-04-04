using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace WkApi.Features.FutureMatches;

public class FutureMatchesSettingsService
{
    private static readonly Regex SafeGameId = new(
        @"^[a-z][a-z0-9_-]{1,39}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    /// <summary>Liquipedia page title segment (Team_Vitality, Karmine_Corp, …).</summary>
    private static readonly Regex SafeTeamPageId = new(
        @"^[A-Za-z0-9_.-]{2,80}$",
        RegexOptions.Compiled | RegexOptions.CultureInvariant);

    private static readonly Dictionary<string, string> KnownGameLabels = new(StringComparer.OrdinalIgnoreCase) {
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

    private readonly FutureMatchesSettingsStore _store;
    private readonly FutureMatchesUserBannerStore _userBanners;
    private readonly IOptions<FutureMatchesOptions> _options;
    private readonly ILogger<FutureMatchesSettingsService> _logger;
    private readonly SemaphoreSlim _seedLock = new(1, 1);

    public FutureMatchesSettingsService(
        FutureMatchesSettingsStore store,
        FutureMatchesUserBannerStore userBanners,
        IOptions<FutureMatchesOptions> options,
        ILogger<FutureMatchesSettingsService> logger)
    {
        _store = store;
        _userBanners = userBanners;
        _options = options;
        _logger = logger;
    }

    public IReadOnlyList<FutureMatchesKnownGameDto> GetKnownGames() =>
        KnownGameLabels
            .OrderBy(kv => kv.Value, StringComparer.OrdinalIgnoreCase)
            .Select(kv => new FutureMatchesKnownGameDto(kv.Key, kv.Value))
            .ToList();

    public async Task<IReadOnlyList<FutureMatchesGameOptions>> GetGamesForCrawlAsync(CancellationToken ct = default)
    {
        var data = await GetOrSeedAsync(ct).ConfigureAwait(false);
        return data.Games;
    }

    public async Task<FutureMatchesSettingsApiDto> GetForApiAsync(CancellationToken ct = default)
    {
        var data = await GetOrSeedAsync(ct).ConfigureAwait(false);
        return ToSettingsApiDto(data);
    }

    public async Task<bool> HasGameAsync(string gameId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(gameId)) {
            return false;
        }

        var data = await GetOrSeedAsync(ct).ConfigureAwait(false);
        return data.Games.Any(g => g.Id.Equals(gameId.Trim(), StringComparison.OrdinalIgnoreCase));
    }

    public async Task<FutureMatchesSettingsApiDto> SaveAsync(
        FutureMatchesUserSettingsFileDto incoming,
        CancellationToken ct = default)
    {
        Normalize(incoming);
        ValidateOrThrow(incoming);
        StripLegacyFollowTeamsForSave(incoming);
        await _store.WriteAsync(incoming, ct).ConfigureAwait(false);
        _logger.LogInformation("FutureMatches settings saved ({Count} games)", incoming.Games.Count);
        return ToSettingsApiDto(incoming);
    }

    private FutureMatchesSettingsApiDto ToSettingsApiDto(FutureMatchesUserSettingsFileDto data)
    {
        var games = data.Games
            .Select(g => new FutureMatchesGameSettingsApiDto(
                g.Id,
                [..g.FollowTeamIds],
                _userBanners.GetPublicUrlIfExists(g.Id)))
            .ToList();

        return new FutureMatchesSettingsApiDto {
            Games = games,
            KnownGames = GetKnownGames(),
        };
    }

    private static void StripLegacyFollowTeamsForSave(FutureMatchesUserSettingsFileDto dto)
    {
        foreach (var g in dto.Games) {
            g.FollowTeams = null;
        }
    }

    private async Task<FutureMatchesUserSettingsFileDto> GetOrSeedAsync(CancellationToken ct)
    {
        var existing = await _store.ReadAsync(ct).ConfigureAwait(false);
        if (existing != null) {
            MigrateLegacyFollowTeams(existing);
            return existing;
        }

        await _seedLock.WaitAsync(ct).ConfigureAwait(false);
        try {
            existing = await _store.ReadAsync(ct).ConfigureAwait(false);
            if (existing != null) {
                MigrateLegacyFollowTeams(existing);
                return existing;
            }

            var seed = new FutureMatchesUserSettingsFileDto {
                Games = _options.Value.Games
                    .Where(g => !string.IsNullOrWhiteSpace(g.Id))
                    .Select(g => new FutureMatchesGameOptions {
                        Id = g.Id.Trim(),
                        FollowTeamIds = NormalizeTeamIdList(
                            g.FollowTeamIds.Count > 0
                                ? g.FollowTeamIds
                                : MigrateLegacyStrings(g.FollowTeams)),
                    })
                    .ToList(),
            };
            StripLegacyFollowTeamsForSave(seed);
            await _store.WriteAsync(seed, ct).ConfigureAwait(false);
            return seed;
        }
        finally {
            _seedLock.Release();
        }
    }

    /// <summary>Copy legacy followTeams (display names) into followTeamIds using space → underscore heuristic.</summary>
    private static void MigrateLegacyFollowTeams(FutureMatchesUserSettingsFileDto dto)
    {
        foreach (var g in dto.Games) {
            if (g.FollowTeamIds.Count > 0) {
                continue;
            }

            if (g.FollowTeams == null || g.FollowTeams.Count == 0) {
                continue;
            }

            g.FollowTeamIds = MigrateLegacyStrings(g.FollowTeams);
        }
    }

    private static List<string> MigrateLegacyStrings(List<string>? legacy)
    {
        var list = new List<string>();
        if (legacy == null) {
            return list;
        }

        foreach (var leg in legacy) {
            if (string.IsNullOrWhiteSpace(leg)) {
                continue;
            }

            var id = leg.Trim();
            if (id.Contains(' ', StringComparison.Ordinal)) {
                id = id.Replace(" ", "_", StringComparison.Ordinal);
            }

            if (!list.Contains(id, StringComparer.OrdinalIgnoreCase)) {
                list.Add(id);
            }
        }

        return list;
    }

    private static List<string> NormalizeTeamIdList(IEnumerable<string> ids) =>
        ids
            .Where(t => !string.IsNullOrWhiteSpace(t))
            .Select(t => t.Trim())
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

    private static void Normalize(FutureMatchesUserSettingsFileDto dto)
    {
        dto.Games = dto.Games
            .Where(g => !string.IsNullOrWhiteSpace(g.Id))
            .Select(g => new FutureMatchesGameOptions {
                Id = g.Id.Trim(),
                FollowTeamIds = NormalizeTeamIdList(g.FollowTeamIds),
                FollowTeams = null,
            })
            .ToList();
    }

    private static void ValidateOrThrow(FutureMatchesUserSettingsFileDto dto)
    {
        if (dto.Games.Count > 24) {
            throw new ArgumentException("Too many games (max 24).");
        }

        var ids = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        foreach (var g in dto.Games) {
            if (string.IsNullOrWhiteSpace(g.Id)) {
                throw new ArgumentException("Each game must have a non-empty id.");
            }

            var id = g.Id.Trim();
            if (!SafeGameId.IsMatch(id)) {
                throw new ArgumentException(
                    $"Invalid game id '{id}'. Use lowercase Liquipedia wiki id (letters, digits, hyphen, underscore).");
            }

            if (!ids.Add(id)) {
                throw new ArgumentException($"Duplicate game id '{id}'.");
            }

            if (g.FollowTeamIds.Count > 40) {
                throw new ArgumentException($"Too many team ids for '{id}' (max 40).");
            }

            foreach (var t in g.FollowTeamIds) {
                if (string.IsNullOrWhiteSpace(t)) {
                    throw new ArgumentException($"Empty team page id in game '{id}'.");
                }

                if (!SafeTeamPageId.IsMatch(t.Trim())) {
                    throw new ArgumentException(
                        $"Invalid team page id '{t}' for game '{id}'. Use the Liquipedia page title (e.g. Team_Vitality, Karmine_Corp).");
                }
            }
        }
    }
}

public record FutureMatchesKnownGameDto(string Id, string Label);

public class FutureMatchesSettingsApiDto
{
    public List<FutureMatchesGameSettingsApiDto> Games { get; set; } = [];
    public IReadOnlyList<FutureMatchesKnownGameDto> KnownGames { get; set; } = [];
}

public record FutureMatchesGameSettingsApiDto(
    string Id,
    IReadOnlyList<string> FollowTeamIds,
    string? CustomBannerUrl);
