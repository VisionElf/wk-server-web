# Code review — wk-server-web

**Scope:** Full-stack repository (ASP.NET Core 9 API + React/Vite SPA).  
**Context assumed:** Private LAN / home box; not exposed as a public internet service.  
**Date:** 2026-04-05

---

## 1. Executive summary

The project is a **small, coherent home-server dashboard**: a React shell with pluggable “sub-apps,” a single ASP.NET Core API, and PostgreSQL for one feature domain. The **Future Matches** area is the most developed (Liquipedia crawling, HTML/image caches, user settings on disk). The **Last Time** feature uses EF Core with a dedicated PostgreSQL schema. Overall structure is **understandable and extensible** for a personal tool; production-hardening (auth, CORS, secrets, tests) is largely **not** present yet, which is acceptable for a trusted LAN deployment if boundaries are clear.

**Verdict on “good base to continue”:** **Yes**, as a **modular monolith** with a clear frontend pattern (`appRegistry` + per-app `routes.tsx` + `app.config.ts`). Scaling would mean adding cross-cutting concerns (auth, configuration, observability) rather than rewriting the layout.

---

## 2. Architecture

### 2.1 Frontend

- **Shell:** `AppShell` wraps sidebar, sub-navigation, and `Outlet` with lazy loading for at least the Console page.
- **Sub-apps:** Each feature lives under `src/apps/<name>/` with `app.config.ts` (metadata for sidebar), `routes.tsx` (React Router fragment), `pages/`, and sometimes `api/client.ts`.
- **Registration:** `core/appRegistry.ts` lists sub-apps in order; `router.tsx` imports each app’s routes. Adding an app requires **two manual steps** (registry + router), documented in a comment—reasonable for small teams.
- **API access:** Relative paths (`/api/...`) with Vite dev proxy to `http://127.0.0.1:5122`. No global API client abstraction; each module uses `fetch` with small `parseJson` helpers—simple and transparent.

### 2.2 Backend

- **Single `WkApi` project:** Controllers under `Controllers/` and `Features/FutureMatches/` (feature-oriented folder for the largest module).
- **DI:** `Program.cs` registers singletons for caches, stores, crawl progress, HTTP clients, and a scoped `FutureMatchesCoordinator`. EF Core `AppDbContext` is registered with Npgsql; **migrations run at startup** (`MigrateAsync`), which is convenient for dev but needs care for production deployments.
- **Data:** `AppDbContext` uses schema `lti` for “last time” tables—clear separation at the DB level.

### 2.3 Cross-cutting flows

- **Future Matches:** Coordinator reads/writes JSON cache, crawl service parses Liquipedia HTML (AngleSharp), page cache + image cache persist under `Data/Cache/`. User banners stored on disk and overlaid on API responses.
- **Server logs:** In-memory ring buffer (`ServerLogBuffer`) fed by a custom logger provider; exposed via `/api/server-logs` for the Console UI.

---

## 3. Clean code & maintainability

### Strengths

- **Consistent API shapes:** DTOs and TypeScript types in the Future Matches client mirror backend concepts.
- **Validation in settings:** `FutureMatchesSettingsService` uses regexes for game IDs and team page IDs; normalization before persistence.
- **URL allowlists:** Page refetch is restricted to `https://liquipedia.net/...`; image refetch requires absolute `http(s)` URLs.
- **Path traversal mitigation:** `FutureMatchesImageCache.TryGetExistingPath` resolves under cache root and checks file name pattern (hash + extension).
- **Async patterns:** Widespread `ConfigureAwait(false)` in library-style code; cancellation tokens on public endpoints.

### Concerns

- **`FutureMatchesCrawlService` is very large** (1000+ lines): parsing, networking, and domain logic are intertwined. Harder to test and to change safely. Splitting into parsers per page type, plus small helpers, would improve readability.
- **Large React pages (e.g. `UpcomingPage.tsx`):** Risk of mixed concerns (data loading, UI, formatting). Extracting hooks and presentational components would align with React best practices.
- **Duplicated labels:** Game labels appear in both crawl service and settings service (`KnownGameLabels` / `GameLabels`). A single source of truth would reduce drift.
- **No automated tests:** No unit or integration tests were found in the repository. Regressions will rely on manual checks.

---

## 4. Organization & repository layout

- **Clear split:** `backend/WkApi` vs `frontend/wk-frontend`.
- **`_template` app:** Good onboarding pattern for new sub-apps.
- **No solution (`.sln`) file at repo root:** Developers typically `dotnet run` from `WkApi`; a root `.sln` would unify IDE experience and CI.
- **Root `frontend/` vs `frontend/wk-frontend`:** Only `wk-frontend` holds `package.json`; clarify if the extra folder level is intentional for future packages.
- **Documentation:** Default Vite `README.md` in the frontend is still the stock template; it does not describe this project (addressed in root `README.md`).

---

## 5. Security (private LAN + box)

Threat model: **any device on the LAN** (or anyone who can reach the host/port) can call the API **without authentication**. That is often acceptable for a home server **if** the network is trusted and the service is not port-forwarded. If the box is reachable from untrusted networks, the current design is **not** sufficient.

| Topic | Observation |
|--------|---------------|
| **Authentication / authorization** | None. All `/api/*` endpoints are open. |
| **CORS** | `AllowAnyOrigin` + any method + any header. On a LAN-only SPA served separately, this is permissive; if the API is ever exposed broadly, tighten to known origins. |
| **Secrets** | `appsettings.Development.json` contains a PostgreSQL connection string with password. For real deployments, prefer **environment variables**, **User Secrets**, or a secret manager; avoid committing production credentials. |
| **SSRF (server-side fetch)** | Crawl and caches target Liquipedia in normal flow. **Manual** image refetch allows **any** `http(s)` URL with a non-empty host—potential SSRF toward internal IPs or metadata endpoints if an attacker can POST to the API. For a private tool, risk is lower; for exposure, restrict hosts (e.g. allowlist CDNs / Liquipedia-related domains) or disable refetch on untrusted networks. |
| **File uploads** | Banner upload is size-limited and content-type constrained to image types; game ID must exist—reasonable checks. |
| **Information disclosure** | `/api/health/db` returns database name and data source—useful for ops; consider restricting in untrusted environments. `/api/server-logs` exposes recent server log lines—powerful for debugging, sensitive if logs ever contain secrets. |
| **HTTPS** | Dev profiles include HTTPS; production behind a reverse proxy should terminate TLS appropriately. |

---

## 6. Dependencies

### Backend (`WkApi.csproj`)

| Package | Role |
|---------|------|
| **AngleSharp** | HTML parsing for Liquipedia—appropriate. |
| **Microsoft.EntityFrameworkCore** + **Npgsql** | PostgreSQL persistence—standard stack. |
| **Microsoft.EntityFrameworkCore.Design** | Migrations tooling (dev). |
| **Microsoft.AspNetCore.OpenApi** | **Referenced but not wired** in `Program.cs` (no Swagger/OpenAPI map). Consider removing if unused, or add OpenAPI/Swagger for API documentation. |

### Frontend (`package.json`)

| Dependency | Role |
|------------|------|
| **react** / **react-dom** | UI (React 19). |
| **react-router-dom** | SPA routing (v7). |
| **Vite** + **@vitejs/plugin-react** | Build and dev server. |
| **TypeScript** + **ESLint** flat config | Type-checking and linting—lean and modern. |

**Assessment:** Dependencies are **minimal and purposeful**—no obvious bloat. The unused OpenApi package on the backend is the main cleanup candidate.

---

## 7. Global approach & methodology

- **Pragmatic monolith:** One API project, one SPA—fits a personal dashboard well.
- **Feature folders** on the backend for the heaviest feature; controllers elsewhere for smaller surfaces—acceptable hybrid.
- **Configuration-driven games** in `appsettings.json` with user overrides in JSON on disk—good for ops without redeploying code.
- **Operational UX:** Console page for logs, health check for DB, crawl progress endpoint—shows attention to running the system locally.

Gaps for “engineering maturity”: automated tests, CI pipeline, structured logging to file/aggregator, and explicit deployment docs.

---

## 8. Final question: Is this a good clean, modular, scalable base?

**Yes, with caveats.**

- **Modularity:** The frontend sub-app pattern and backend feature area for Future Matches are **good patterns** to copy for new features. The main scalability limit is **organizational** (large files) rather than architectural deadlock.
- **Scalability:** For a **single-machine home server**, the architecture scales far enough. For **multiple users, teams, or internet exposure**, you would add **authentication**, **stricter network policies**, and possibly **split services**—not because the current design is wrong, but because requirements change.
- **“Clean” baseline:** The codebase is **readable and consistent** for a small project. Investing in **tests**, **smaller modules**, and **secret management** would raise it from “solid personal project” to “maintainable long-term product.”

---

## 9. Summary table

| Area | Rating (informal) | Notes |
|------|-------------------|--------|
| Clean code | Good / mixed | Large files; duplication of game metadata |
| Organization | Good | Clear apps + API layout; docs lag code |
| Architecture | Good for scope | Monolith + feature module; no auth |
| Security | LAN-appropriate | Open API; permissive CORS; review if exposed |
| Dependencies | Lean | Remove or use OpenApi package |
| Testability | Weak | No tests; big methods hinder unit testing |

This review is based on static analysis of the repository as of the review date; runtime behavior and deployment specifics were not executed in this pass.
