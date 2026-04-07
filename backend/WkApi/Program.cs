using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using WkApi;
using WkApi.Core.Data;
using WkApi.Apps.Daylog;
using WkApi.Apps.LastTime;
using WkApi.Apps.FutureMatches;
using WkApi.Infrastructure.Files;
using WkApi.Infrastructure.Logging;
using WkApi.Infrastructure.Security;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options => {
    options.MultipartBodyLengthLimit = FileUploadLimits.DefaultMaxBytes;
});
builder.Services.AddControllers();
builder.Services.AddOpenApi();

builder.Services.Configure<WkApiOptions>(builder.Configuration.GetSection(WkApiOptions.SectionName));

var serverLogBuffer = new ServerLogBuffer();
builder.Services.AddSingleton(serverLogBuffer);
builder.Logging.AddProvider(new ServerLogBufferLoggerProvider(serverLogBuffer));

builder.Services.Configure<FutureMatchesOptions>(
    builder.Configuration.GetSection(FutureMatchesOptions.SectionName));
builder.Services.AddSingleton<FutureMatchesCacheStore>();
builder.Services.AddSingleton<FutureMatchesPageCacheStore>();
builder.Services.AddSingleton<FutureMatchesCrawlProgress>();
builder.Services.AddSingleton<FutureMatchesSettingsStore>();
builder.Services.AddSingleton<FutureMatchesUserBannerStore>();
builder.Services.AddSingleton<FutureMatchesSettingsService>();
builder.Services.AddHttpClient<FutureMatchesCrawlService>(client => {
    client.Timeout = TimeSpan.FromSeconds(90);
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (compatible; WkServerWeb/1.0) FutureMatches (+https://liquipedia.net/)");
});
builder.Services.AddHttpClient<FutureMatchesImageCache>(client => {
    client.Timeout = TimeSpan.FromSeconds(60);
    client.DefaultRequestHeaders.UserAgent.ParseAdd(
        "Mozilla/5.0 (compatible; WkServerWeb/1.0) FutureMatches (+https://liquipedia.net/)");
});
builder.Services.AddScoped<FutureMatchesCoordinator>();

var corsOrigins = builder.Configuration.GetSection("WkApi:CorsAllowedOrigins").Get<string[]>() ?? [];
builder.Services.AddCors(options =>
{
    options.AddPolicy("WkCors", policy =>
    {
        if (corsOrigins.Length > 0) {
            policy.WithOrigins(corsOrigins).AllowAnyHeader().AllowAnyMethod();
        }
        else if (builder.Environment.IsDevelopment()) {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
        else {
            policy.AllowAnyOrigin().AllowAnyHeader().AllowAnyMethod();
        }
    });
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

if (corsOrigins.Length == 0 && !app.Environment.IsDevelopment()) {
    app.Logger.LogWarning(
        "WkApi:CorsAllowedOrigins is empty; CORS allows any origin. Set explicit origins for browser clients.");
}

// Production: set WkApi:RunMigrationsAtStartup to false when migrations run in CI/deploy (dotnet ef database update).
var runMigrations = builder.Configuration.GetValue("WkApi:RunMigrationsAtStartup", true);
using (var scope = app.Services.CreateScope()) {
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    if (runMigrations) {
        await db.Database.MigrateAsync();
    }

    await LtiDbSeeder.SeedDefaultsAsync(db);
    await DaylogDbSeeder.EnsureDefaultsAsync(db);
}

app.UseCors("WkCors");
app.UseMiddleware<ApiKeyMiddleware>();
app.MapOpenApi();
app.MapControllers();

app.Run();
