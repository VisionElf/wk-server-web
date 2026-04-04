using Microsoft.AspNetCore.Http.Features;
using Microsoft.EntityFrameworkCore;
using WkApi.Data;
using WkApi.Data.Lti;
using WkApi.Features.FutureMatches;
using WkApi.Infrastructure.Logging;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<FormOptions>(options => {
    options.MultipartBodyLengthLimit = 3_145_728;
});
builder.Services.AddControllers();

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

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAll",
        policy => policy
            .AllowAnyOrigin()
            .AllowAnyMethod()
            .AllowAnyHeader());
});

builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(builder.Configuration.GetConnectionString("DefaultConnection")));

var app = builder.Build();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
    await LtiDbSeeder.SeedDefaultsAsync(db);
}

app.UseCors("AllowAll");

app.MapControllers();

app.Run();