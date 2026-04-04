namespace WkApi;

public class WkApiOptions
{
    public const string SectionName = "WkApi";

    /// <summary>
    /// When non-empty, all requests must send header <c>X-Api-Key</c> with this value (except CORS OPTIONS).
    /// Leave empty for local / trusted networks.
    /// </summary>
    public string? ApiKey { get; set; }

    /// <summary>
    /// Browser origins allowed for CORS. When empty and the host environment is Development, any origin is allowed.
    /// For Production, set explicit origins (e.g. your SPA URL).
    /// </summary>
    public string[] CorsAllowedOrigins { get; set; } = [];

    /// <summary>
    /// When false, EF migrations are not applied at startup (run <c>dotnet ef database update</c> in deploy).
    /// Default true for local/dev convenience.
    /// </summary>
    public bool RunMigrationsAtStartup { get; set; } = true;
}
