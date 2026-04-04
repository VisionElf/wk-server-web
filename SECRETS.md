# Secrets and sensitive configuration

This document lists **what** credentials exist, **who** consumes them, and **where** to set them. **Do not commit real secret values** to the repository.

## PostgreSQL (`ConnectionStrings:DefaultConnection`)

| Consumer | Purpose |
|----------|---------|
| `WkApi` (`AppDbContext`, EF Core migrations, LTI seed) | Application data (e.g. Last Time items). |

**Where to configure**

- **Local development:** [User Secrets](https://learn.microsoft.com/en-us/aspnet/core/security/app-secrets) for the `WkApi` project, or environment variable `ConnectionStrings__DefaultConnection`.
- **Production / containers:** Environment variables, Kubernetes secrets, or your host’s secret store — never bake passwords into `appsettings.*.json` in git.

Example (user secrets, from `backend/WkApi`):

```bash
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=...;Port=5432;Database=...;Username=...;Password=..."
```

## API key (`WkApi:ApiKey`)

| Consumer | Purpose |
|----------|---------|
| `ApiKeyMiddleware` | When non-empty, requires header `X-Api-Key` on requests (CORS `OPTIONS` excluded). |

**Where to configure**

- `appsettings.Production.json`, environment variable `WkApi__ApiKey`, or the secret store you use in deploy.

**Frontend:** If the API key is enabled, the SPA must send the same value. Build the frontend with environment variable `VITE_WK_API_KEY` so `src/apps/future-matches/api/client.ts` (and any other client using the shared fetch helpers) can attach `X-Api-Key`.

## CORS (`WkApi:CorsAllowedOrigins`)

Not a secret, but security-relevant: list the browser origins allowed to call the API (e.g. your SPA URL). Empty list in Development allows any origin; in Production an empty list logs a warning — set explicit origins for real deployments.

## Liquipedia image refetch (`FutureMatches:ImageRefetchAllowedHosts`)

Host allowlist for manual image cache refetch (SSRF mitigation). Configure in `appsettings` if you need hosts beyond the defaults.

## Summary table

| Key / setting | Typical env var | Used by |
|---------------|-----------------|---------|
| PostgreSQL connection | `ConnectionStrings__DefaultConnection` | Backend EF Core |
| Optional API key | `WkApi__ApiKey` | Backend middleware; optional `VITE_WK_API_KEY` on frontend build |
