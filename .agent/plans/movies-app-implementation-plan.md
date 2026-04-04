# Movies app — implementation plan (Unity → web)

This document captures **product decisions** and a **technical roadmap** for replacing the Unity project at `C:\Dev\Unity\Movies` with a third sub-app in `wk-server-web`. It is written for **future maintainers and AI agents**; keep it updated when scope changes.

### Technology stack (summary)

The Movies app uses the **same stack as the rest of `wk-server-web`**, plus **outbound HTTP** to external movie APIs and **extra EF entities** for user data and the TMDB/OMDB cache.

| Layer | Technologies |
|-------|----------------|
| **Backend** | **.NET 9** (`net9.0`), **ASP.NET Core** Web API, **EF Core 9** + **Npgsql** → **PostgreSQL**; **`System.Text.Json`** for all JSON (import body, deserializing TMDB/OMDB responses, serialized cache payloads); **`IHttpClientFactory` / `HttpClient`** for TMDB and OMDB; existing **CORS**, **`ApiKeyMiddleware`**, **`MapOpenApi`**. New code under `WkApi/Apps/Movies/` (same patterns as `LastTime`, `FutureMatches`). |
| **Frontend** | **React 19**, **TypeScript**, **Vite**, **react-router-dom**; same **shell**, **`ui.css`**, and **`apiHeaders`** / optional **`VITE_WK_API_KEY`** as other sub-apps. New routes under `src/apps/movies/`. |
| **External APIs** | **TMDB** and **OMDB** REST endpoints — **called only from the server**; keys in configuration / user secrets / environment variables, not exposed to the browser. |
| **Persistence** | **User movies** + **permanent API cache** in PostgreSQL; EF entities under **`Apps/Movies/Entities/`** (same pattern as **`Apps/LastTime/Entities/`**). **Unity import:** JSON body parsed server-side (same conceptual shape as `database.json`). |
| **Ops / backup** | **`pg_dump`** (and optional JSON export) scheduled on the host; optional NAS copy — **outside** the .NET stack, OS-level or scripts. |

**What changes vs today’s repo:** new controllers/DTOs, EF models and migrations, `HttpClient` registration and TMDB/OMDB client helpers, **`System.Text.Json`** usage where Movies touches JSON, and a new React sub-app — **no new languages or frameworks** beyond what `wk-server-web` already uses.

---

## 1. Goals

| Item | Decision |
|------|----------|
| **Primary goal** | **Replace Unity** as the day-to-day tool for this workflow. |
| **MVP scope** | **Watched movies** + **rich movie detail** (parity with what Unity needed for browsing one’s library and opening a title). |
| **Users** | **Single-user** (mono); no multi-tenant requirement for v1. |
| **External APIs** | **TMDB and OMDB** — both used **server-side only** (keys in server config/secrets, never sent to the browser). |
| **Source of truth** | **PostgreSQL via WkApi** after migration. Flow: **import existing Unity JSON once** → **web app is authoritative** going forward. |
| **Games** | **Out of scope for v1.** **Future:** manual entries only (no external game APIs); schema/UI should **allow** this extension without a big rewrite. |
| **Hosting** | **Same machine** as the current server (on the **local network**). All persistent state **on that server**. |
| **Backups** | **Required:** periodic export/backup **on server disk** (e.g. daily). **[Low priority]** optional copy to **NAS** if a safe path/credentials can be configured later. |
| **TMDB / OMDB data** | **Persistent server-side cache with no expiration** (final product, not a temporary MVP shortcut). New fetches are written to the DB and reused forever until **manually** refreshed via a **cache manager** (API + UI control). Same idea as Unity’s in-memory `DisplayedCache` / downloaded assets, but durable. |

**Explicitly out of MVP**

- Unity-style **local folder scanning** (`LocalMovies`, fixed Windows paths) — not replicated; the web app does not access the user’s PC filesystem.
- **Games** UI and full CRUD (planned later, manual).

---

## 2. Reference: Unity project (for parity checks)

- **Root:** `C:\Dev\Unity\Movies`
- **User database (legacy):** `%UserProfile%\Documents\MovieDatabase\database.json` (also `copy_database.json` in builds for samples).
- **Core models:** `Assets/Scripts/Runtime/Database/` — `Movie`, `MyNote`, `Database` aggregate (movies, series, episodes, watchlist, games).
- **API surface used in Unity:** `IMovieApi` / `TMDBAPIWrapper` (TMDB), `OMDBApi` (OMDB). **Movie detail** combines TMDB + OMDB (e.g. IMDB rating, Metascore) — see `DisplayedMovie.cs`.
- **MVP web focus:** data and flows closest to **`MainView`** + **detail popups** (not full Discover/Series/Local in v1 unless explicitly added later).

---

## 3. Target architecture

### 3.1 Backend (`backend/WkApi`)

- New app area, e.g. `WkApi/Apps/Movies/` (mirror `LastTime`, `FutureMatches` patterns).
- **Route prefix:** e.g. `api/movies` (final name TBD; keep consistent with OpenAPI and frontend client).
- **EF Core + PostgreSQL:** new entities for **watched movies** and **detail-related persisted fields** aligned with Unity’s `Movie` + `MyNote` (and enums: language, location, note letter, etc. — map from JSON strings to stable storage).
- **HTTP clients:** registered `HttpClient`(s) for TMDB and OMDB; **all** outbound calls from the server.
- **Endpoints (conceptual MVP):**
  - CRUD or read/write list of **user movies** (by internal id / tmdb id as natural key).
  - **GET** detail: merge **stored user fields** + **TMDB/OMDB enrichment** read from the **permanent cache** when present; on cache miss, fetch from APIs, **persist to cache**, then return. Document the merged DTO in OpenAPI.
  - **Cache manager (manual refresh only):** endpoints to **re-fetch** TMDB/OMDB for one title (by `tmdbId` or internal id), optionally **bulk** or “all in library” — **no TTL** and **no scheduled auto-refresh**; invalidation is **only** via these actions (aligned with Unity: data stays until you explicitly refresh).
  - **POST** `import` (or dedicated admin route): **upload/accept Unity `database.json`** (or subset) **once** to bootstrap; validate and map **movies** only for MVP (ignore or stub `games`; optionally **skip** or **queue** series/episodes/watchlist until a later phase).
- **Migrations:** new migration(s); follow existing `Program.cs` migration-at-startup pattern.

### 3.4 TMDB / OMDB persistent cache (no expiration)

- **Storage:** PostgreSQL tables (or JSON columns on a dedicated cache entity) holding **raw or normalized** API payloads per `tmdbId` / `imdbId` as appropriate, plus **timestamps** (`fetched_at_utc`) for **display and debugging only** — **not** used to expire entries.
- **Read path:** detail/list enrichment uses **cache first**; **write-through** on miss after successful API calls.
- **Refresh path:** user-triggered **refresh** replaces cache rows for the selected scope. Failed refresh should keep **previous cached** data when possible and surface an error in the API/UI.
- **Posters:** either **store TMDB image paths** in cached payload (browser still hits `image.tmdb.org`) or optionally **blob paths** on disk later — default remains **CDN URLs** from cached TMDB fields unless you add a separate image cache later.
- **Frontend:** a **Refresh** control on movie detail (and optionally a small **cache** / **settings** area for bulk refresh) calling the cache manager API.

### 3.2 Frontend (`frontend/wk-frontend`)

- New sub-app: `src/apps/movies/` with `app.config.ts`, `routes.tsx`, `subApp.ts`, **register in `appRegistry.ts` only** (single registration point).
- **MVP pages:** list of watched films (sort/filter minimal), **movie detail** view (poster, metadata, ratings, user note dimensions, date seen, etc. — match Unity where reasonable).
- **Styling:** reuse existing `ui.css` / shell patterns like other apps.

### 3.3 Configuration

- **Secrets:** TMDB API key, OMDB API key — `appsettings`, user secrets, or env vars on the server; document variable names in this file when implemented.

---

## 4. Data model notes

### 4.1 Unity JSON → DB (import)

- Preserve compatibility with the **current** `database.json` shape for **movies** (see sample under Unity `Builds/.../copy_database.json` or live user file).
- Fields to support at minimum: `title`, `year`, `imdbId`, `tmdbId`, `dateSeen`, `languageSeen`, `locationType`, `note`, `myNote` (hook, logic, immersion, impact, soundtrack, engagement — confirm names against Unity `MyNote.cs`).
- **Import behavior:** idempotent strategy (e.g. upsert by `tmdbId`) — specify in implementation to avoid duplicates on re-import.

### 4.2 Future: games (manual)

- **No TMDB/OMDB.** Plan for a small **manual** entity: title, year, optional fields similar to Unity’s `Game` (`dateSeen`, `note`, `location`, `hasBeenPlayed`, etc.) — **do not implement** until prioritized; only avoid painting the DB into a corner (e.g. separate table `movies_user` vs `games_user`).

---

## 5. Backup strategy

1. **Primary:** **Scheduled job** on the server (Windows Task Scheduler, systemd timer, or built-in background service) that exports **PostgreSQL** or **application-level JSON dump** of the Movies data **daily** to a **local directory** on the server (configurable path, retention policy).
2. **[Low priority] NAS:** if the NAS is reachable from the server (SMB/NFS/rsync), **optional second step** to copy the same artifact — **only** after local backup is reliable; handle credentials via OS or secure config, not committed to git.

Document the exact mechanism and paths in `README` or ops notes when implemented.

---

## 6. Implementation phases (suggested order)

1. **Schema + API skeleton** — entities, migrations, health of CRUD for movies.
2. **TMDB + OMDB integration + persistent cache tables** — write-through on miss; **no** time-based eviction.
3. **Cache manager API** — manual refresh per movie / bulk; wire **Refresh** in UI.
4. **Import endpoint** — Unity JSON → DB (movies only for MVP).
5. **Frontend sub-app** — list + detail; wire to API.
6. **Backup** — daily local export + rotation; NAS hook as optional follow-up.
7. **Later (post-MVP):** series/episodes, watchlist, discover, games (manual), etc., as separate increments.

### 6.1 Backend folder organization (draft)

Target root: `backend/WkApi/`. **EF entities live under each app** (e.g. **`Apps/LastTime/Entities/`** for Last Time — already done in the repo). Movies should mirror that: **`Apps/Movies/Entities/`** for `UserMovie` and cache entities. **`Data/`** holds only **`AppDbContext.cs`** and **`Migrations/`**.

```
WkApi/
├── Apps/
│   ├── LastTime/
│   │   ├── Controllers/
│   │   ├── Entities/                        # LtiItem, LtiItemEvent (EF)
│   │   └── LtiDbSeeder.cs
│   └── Movies/
│       ├── Controllers/
│       │   ├── MoviesController.cs          # GET list, GET detail, PATCH/PUT user fields, POST import
│       │   └── MoviesCacheController.cs       # POST refresh (by id, bulk, optional “all”) — or merge into MoviesController if preferred
│       ├── Entities/                        # UserMovie, cache rows, etc. (EF)
│       ├── Services/
│       │   ├── MoviesService.cs               # Orchestrates user rows + merged detail DTO
│       │   ├── MoviesImportService.cs         # Unity JSON → upsert movies + summary
│       │   └── MoviesCacheService.cs          # Read/write TMDB+OMDB cache, refresh without TTL
│       ├── Tmdb/
│       │   ├── TmdbApiClient.cs               # HttpClient calls + System.Text.Json deserialize
│       │   └── TmdbModels.cs                  # DTOs for TMDB JSON (or split per endpoint group)
│       ├── Omdb/
│       │   ├── OmdbApiClient.cs
│       │   └── OmdbModels.cs
│       ├── MoviesDtos.cs                      # API request/response DTOs (or split under Dtos/)
│       └── MoviesOptions.cs                   # Bind from appsettings: API keys, base URLs
├── Data/
│   ├── AppDbContext.cs                      # DbSet registrations + OnModelCreating; `using WkApi.Apps.*.Entities`
│   └── Migrations/
└── Program.cs                                # Register HttpClient + options + Movies services
```

**Notes**

- **Controllers** stay thin; **Services** hold orchestration and transactions.
- **Tmdb/** and **Omdb/** are **HTTP + deserialization only**; no business rules beyond parsing.
- **Migrations** remain in `Data/Migrations/` (single `AppDbContext`); do not create a second DbContext for Movies unless the project later splits databases.
- **Naming** is illustrative — adjust if you prefer `MoviesUserEntry` vs `UserMovie`, or a single cache table with provider discriminator.

### 6.2 MVP frontend pages (draft)

Sub-app root: `frontend/wk-frontend/src/apps/movies/`. Register in `appRegistry` with path prefix **`/movies`** (see §7).

| # | Route (under `/movies`) | Component (suggested) | Purpose |
|---|-------------------------|-------------------------|---------|
| 1 | `/movies` (index → same) | `MoviesListPage.tsx` | **Watched movies**: table or cards, sort/filter minimal (date, note), links to detail, actions: open import, optional “add movie”. |
| 2 | `/movies/:id` | `MovieDetailPage.tsx` | **Detail**: merged user + TMDB + OMDB from cache; **Refresh** (manual cache reload); edit user fields (notes, date seen, language, location). `:id` = internal GUID or stable key — **lock in implementation** (document in OpenAPI). |
| 3 | `/movies/import` | `MoviesImportPage.tsx` | **Import Unity `database.json`**: file input or paste, POST to API, show **summary** (imported / skipped / sections ignored). |

**Strongly recommended for MVP (replace Unity “add” flow)**

| # | Route | Component | Purpose |
|---|--------|-----------|---------|
| 4 | `/movies/add` | `MoviesAddPage.tsx` | **Add a film**: TMDB search (server-proxied), pick result, create user row + trigger cache fetch. Can be merged into a **modal** on the list page instead of a route — same scope. |

**Out of MVP (no dedicated page yet)**

- Discover, series, watchlist, games, settings beyond cache refresh.
- App-level **404** continues to use the shell `NotFoundPage` (not under `movies/`).

**`subNav` (sidebar / top tabs) — minimal**

- **Library** (or “Watched”) → list (`/movies` or `/movies/watched` if you use a segment).
- **Import** → `/movies/import`.
- If **Add** is a full page: **Add** → `/movies/add`; if modal-only, omit from `subNav`.

---

## 7. Pre-implementation decisions (locked)

Defaults below avoid reopening design during coding. Edit this section only if requirements change.

| Topic | Decision |
|-------|----------|
| **JSON on .NET** | **`System.Text.Json`** only (`JsonSerializer`, options for case-insensitive / naming as needed) — import, TMDB/OMDB response DTOs, and serialized cache blobs. **Do not** add Newtonsoft.Json for Movies. |
| **API route prefix** | `api/movies` (e.g. `GET /api/movies`, `GET /api/movies/{id}`, `POST /api/movies/import`). |
| **Mono-user modeling** | No `user_id` for MVP: global tables (single tenant). Add a user key later only if multi-tenant is required. |
| **Dates / times** | Store **`date_seen` (and similar) in UTC** (`timestamp with time zone`). API returns **ISO 8601**; the **browser formats** local time for display. |
| **Unity enums** | Persist as **strings** matching Unity export (`languageSeen`, `locationType`, `note`, `MyNote` axes) for JSON round-trip; validate on write with allow-lists aligned to Unity enums. |
| **Movie detail payload** | **Single GET** returning a **merged DTO**: persisted user fields + TMDB/OMDB fields from the **permanent DB cache** when available; on **cache miss**, fetch APIs, **persist**, then return. **No TTL:** cached rows stay valid until **manual refresh** (see cache manager). |
| **Posters / images** | **TMDB CDN URLs** derived from **cached** TMDB payload (`image.tmdb.org`); **browser loads images directly** (no proxy). |
| **Import file (`database.json`)** | Parse full Unity root; **import `movies[]` only** for MVP. **Ignore** `series`, `episodes`, `watchlist`, `games` but **return a summary** (counts per section skipped). **Unknown properties:** ignore. **Upsert** by **`tmdbId`**; rows **missing `tmdbId`** → **skip + count** in summary. **Max body size** e.g. 20–50 MB. |
| **Re-import** | **Idempotent upsert** by `tmdbId` (updates user fields), no duplicate rows. |
| **WkApi API key** | If `WkApi:ApiKey` is set, movie endpoints (including import) use **`X-Api-Key`** like the rest of the API. Frontend: **`VITE_WK_API_KEY`**. No separate movies admin key for MVP. |
| **Backups (daily, server disk)** | **Primary:** **`pg_dump`** of the **whole** app database (single restore story for all apps). **Optional:** JSON export of Movies-only data for inspection/portability. **Retention:** last N days (configurable). |
| **NAS (low priority)** | Copy the same dump(s) to a share or `rsync` target; **credentials not in git** (mapped drive, env, or server-side secret). |
| **OMDB / TMDB failures** | On read: return **user data + last successful cache** if APIs fail on a forced refresh; on first fetch with no cache, return **partial** (user-only) + error hint. **Manual refresh** that fails should **not** delete existing cache rows unless you explicitly choose “hard refresh” semantics — default: **keep previous cache**. |
| **Games (future)** | **Separate table**, manual fields only; no Unity import until a later milestone. |

**Non-issues:** CORS, EF migrations, and optional API key are already wired (`ApiKeyMiddleware`, `VITE_WK_API_KEY`).

---

## 8. Open points for implementation (minor)

- [ ] Exact property names on merged movie-detail DTO (mirror OpenAPI once implemented).
- [ ] `pg_dump` schedule and paths for the **actual** server OS (Windows vs Linux).
- [ ] Cache table shape: **normalized columns** vs **JSONB** blobs per API response (trade-off: queryability vs fidelity to TMDB/OMDB payloads).

---

## 9. Changelog

| Date | Change |
|------|--------|
| 2026-04-05 | Initial plan from user requirements (Unity replacement, mono-user, TMDB+OMDB, DB + import + backups). |
| 2026-04-05 | Section 7: locked pre-implementation defaults (import, backups, API key, dates, posters). |
| 2026-04-05 | Persistent TMDB/OMDB cache (no expiration), manual cache manager + UI refresh; phases updated. |
| 2026-04-05 | Technology stack summary (same as repo + TMDB/OMDB HTTP, new EF entities). |
| 2026-04-05 | Explicit **System.Text.Json** for all Movies JSON on the server (stack table + §7). |
| 2026-04-05 | §6.1–6.2: Draft **backend folder layout** and **MVP pages** (list, detail, import; add recommended). |
| 2026-04-05 | **Last Time** EF types moved from `Data/Lti/` to **`Apps/LastTime/Entities/`**; plan §6.1: Movies entities → **`Apps/Movies/Entities/`** (not under `Data/`). |
