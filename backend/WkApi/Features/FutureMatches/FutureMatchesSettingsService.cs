using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;

namespace WkApi.Features.FutureMatches;

public class FutureMatchesSettingsService
{
    private static readonly Regex SafeGameId = new(
        @"^[a-z][a-z0-9_-]{1,39}$",
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
    private readonly IOptions<FutureMatchesOptions> _options;
    private readonly ILogger<FutureMatchesSettingsService> _logger;
    private readonly SemaphoreSlim _seedLock = new(1, 1);

    public FutureMatchesSettingsService(
        FutureMatchesSettingsStore store,
        IOptions<FutureMatchesOptions> options,
        ILogger<FutureMatchesSettingsService> logger)
    {
        _store = store;
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
        return new FutureMatchesSettingsApiDto {
            Games = data.Games,
            KnownGames = GetKnownGames(),
        };
    }

    public async Task<FutureMatchesSettingsApiDto> SaveAsync(
        FutureMatchesUserSettingsFileDto incoming,
        CancellationToken ct = default)
    {
        Normalize(incoming);
        ValidateOrThrow(incoming);
        await _store.WriteAsync(incoming, ct).ConfigureAwait(false);
        _logger.LogInformation("FutureMatches settings saved ({Count} games)", incoming.Games.Count);
        return new FutureMatchesSettingsApiDto {
            Games = incoming.Games,
            KnownGames = GetKnownGames(),
        };
    }

    private async Task<FutureMatchesUserSettingsFileDto> GetOrSeedAsync(CancellationToken ct)
    {
        var existing = await _store.ReadAsync(ct).ConfigureAwait(false);
        if (existing != null) {
            return existing;
        }

        await _seedLock.WaitAsync(ct).ConfigureAwait(false);
        try {
            existing = await _store.ReadAsync(ct).ConfigureAwait(false);
            if (existing != null) {
                return existing;
            }

            var seed = new FutureMatchesUserSettingsFileDto {
                Games = _options.Value.Games
                    .Where(g => !string.IsNullOrWhiteSpace(g.Id))
                    .Select(g => new FutureMatchesGameOptions {
                        Id = g.Id.Trim(),
                        FollowTeams = g.FollowTeams
                            .Where(t => !string.IsNullOrWhiteSpace(t))
                            .Select(t => t.Trim())
                            .ToList(),
                    })
                    .ToList(),
            };
            await _store.WriteAsync(seed, ct).ConfigureAwait(false);
            return seed;
        }
        finally {
            _seedLock.Release();
        }
    }

    private static void Normalize(FutureMatchesUserSettingsFileDto dto)
    {
        dto.Games = dto.Games
            .Where(g => !string.IsNullOrWhiteSpace(g.Id))
            .Select(g => new FutureMatchesGameOptions {
                Id = g.Id.Trim(),
                FollowTeams = g.FollowTeams
                    .Where(t => !string.IsNullOrWhiteSpace(t))
                    .Select(t => t.Trim())
                    .Distinct(StringComparer.OrdinalIgnoreCase)
                    .ToList(),
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

            if (g.FollowTeams.Count > 40) {
                throw new ArgumentException($"Too many teams for '{id}' (max 40).");
            }

            foreach (var t in g.FollowTeams) {
                if (string.IsNullOrWhiteSpace(t)) {
                    throw new ArgumentException($"Empty team name in game '{id}'.");
                }

                if (t.Length > 80) {
                    throw new ArgumentException($"Team name too long in game '{id}'.");
                }
            }
        }
    }
}

public record FutureMatchesKnownGameDto(string Id, string Label);

public class FutureMatchesSettingsApiDto
{
    public List<FutureMatchesGameOptions> Games { get; set; } = [];
    public IReadOnlyList<FutureMatchesKnownGameDto> KnownGames { get; set; } = [];
}
