# wk-server-web

Personal **home-server web dashboard**: a React single-page application talks to a small **ASP.NET Core** API backed by **PostgreSQL**. It is intended to run on a private machine (e.g. behind a home router), not as a public multi-tenant service.

## What this repository contains

### Frontend (`frontend/wk-frontend`)

- **Stack:** React 19, TypeScript, Vite 8, React Router 7.
- **Shell:** Shared layout with sidebar and per-app sub-navigation (`src/shell/`).
- **Sub-apps** (`src/apps/`): independent feature areas, each with:
  - `app.config.ts` — title, route prefix, sub-nav entries (sidebar integration).
  - `routes.tsx` — route tree fragment for that app.
  - `pages/` — screens; some apps include `api/client.ts` for `fetch` wrappers.

**Apps included (typical):**

| Area | Role |
|------|------|
| **Dashboard** | Sample/overview; checks `/api/hello`. |
| **Operations** | Placeholder pages for operational workflows. |
| **Last time** | Track named items and “when did it last happen” — data in PostgreSQL (`lti` schema). |
| **Future matches** | Scrape/cache Liquipedia for upcoming matches for configured teams; settings, caches, banners. |
| **Console** | Live view of recent server log lines from an in-memory buffer (`/api/server-logs`). |

New apps are registered in `src/core/appRegistry.ts` and `src/router.tsx` (see comments there). A **`_template`** app exists as a copy-paste starting point.

**Development:** Vite serves the SPA and **proxies `/api`** to the backend (default `http://127.0.0.1:5122` — see `vite.config.ts`).

### Backend (`backend/WkApi`)

- **Stack:** .NET 9, ASP.NET Core, EF Core 9, Npgsql, AngleSharp (HTML parsing).
- **Entry:** `Program.cs` — controllers, CORS, EF Core, Future Matches services, in-memory log buffer, **database migrations on startup**.
- **API surface (examples):**
  - `/api/hello` — smoke test.
  - `/api/last-time/*` — CRUD-style API for “last time” items and history.
  - `/api/future-matches/*` — cached match payload, refresh crawl, page/image cache admin, settings, user banner uploads, static media paths.
  - `/api/server-logs` — recent log lines for the Console UI.

**Data on disk:** Future Matches uses JSON and HTML/image caches under configurable paths (see `appsettings.json` → `FutureMatches`).

## Prerequisites

- [.NET 9 SDK](https://dotnet.microsoft.com/download)
- [Node.js](https://nodejs.org/) (LTS recommended) for the frontend
- [PostgreSQL](https://www.postgresql.org/) for Last Time (and any feature using `AppDbContext`)

## Running locally (typical)

1. **Database:** Create a database and user; set `ConnectionStrings:DefaultConnection` (e.g. via `appsettings.Development.json`, environment variables, or User Secrets — do not commit production passwords).

2. **API** (from `backend/WkApi`):

   ```bash
   dotnet run
   ```

   Default HTTP URL in dev is often `http://localhost:5122` (see `Properties/launchSettings.json`).

3. **Frontend** (from `frontend/wk-frontend`):

   ```bash
   npm install
   npm run dev
   ```

   Open the URL Vite prints (e.g. `http://localhost:5173`). API calls use relative `/api/...` and are proxied to the API in dev.

## Configuration notes

- **CORS** is currently permissive (`AllowAnyOrigin`) — acceptable for a trusted LAN SPA + API split; tighten if exposure changes.
- **There is no built-in authentication** — the API assumes a trusted network.
- **Future Matches** behavior (games, teams, cache paths, delays) is driven from `appsettings.json` and user settings files; see `REVIEW.md` for architecture detail.

## Documentation

- **`REVIEW.md`** — Code review: clean code, structure, security, dependencies, and whether the codebase is a good base to extend.
- **`TODO.md`** — Suggested improvements and follow-ups.

## License / usage

Internal/personal project unless otherwise stated in repository metadata.
