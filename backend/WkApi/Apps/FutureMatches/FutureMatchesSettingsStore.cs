using System.Text.Json;
using Microsoft.Extensions.Options;

namespace WkApi.Apps.FutureMatches;

public class FutureMatchesSettingsStore
{
    private static readonly JsonSerializerOptions JsonOptions = new() {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
    };

    private readonly string _filePath;
    private readonly SemaphoreSlim _lock = new(1, 1);

    public FutureMatchesSettingsStore(IHostEnvironment env, IOptions<FutureMatchesOptions> options)
    {
        var rel = options.Value.SettingsFileRelativePath;
        _filePath = Path.GetFullPath(Path.Combine(env.ContentRootPath, rel));
    }

    public async Task<FutureMatchesUserSettingsFileDto?> ReadAsync(CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct).ConfigureAwait(false);
        try {
            if (!File.Exists(_filePath)) {
                return null;
            }

            await using var stream = File.OpenRead(_filePath);
            return await JsonSerializer.DeserializeAsync<FutureMatchesUserSettingsFileDto>(stream, JsonOptions, ct)
                .ConfigureAwait(false);
        }
        finally {
            _lock.Release();
        }
    }

    public async Task WriteAsync(FutureMatchesUserSettingsFileDto payload, CancellationToken ct = default)
    {
        await _lock.WaitAsync(ct).ConfigureAwait(false);
        try {
            var dir = Path.GetDirectoryName(_filePath);
            if (!string.IsNullOrEmpty(dir)) {
                Directory.CreateDirectory(dir);
            }

            await using var stream = File.Create(_filePath);
            await JsonSerializer.SerializeAsync(stream, payload, JsonOptions, ct).ConfigureAwait(false);
        }
        finally {
            _lock.Release();
        }
    }
}
