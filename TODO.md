# TODO — improvements backlog

Prioritized suggestions derived from code review. Adjust order to match your deployment and risk tolerance.

## User Wishlist

- [ ] Remove any non-used config/other files — periodic cleanup; none removed beyond the above in this pass
- [ ] For tsx files: Separate renderers & logic code (when possible) — ongoing; `UpcomingPage` already split into hooks/components
- [ ] Refactor as much duplicated code as possible (c# / ts / tsx / css) — partial (`apiHeaders`, `FileUploadLimits`, shared fetch headers)

## Lower priority (quality & DX)

- [ ] **HTTPS / “Not secure” in the browser:** Expected when serving over plain HTTP (typical on a LAN). To get a padlock: terminate TLS at a reverse proxy (Caddy, nginx, Traefik) with a real certificate (Let’s Encrypt if public hostname) or a private CA / `mkcert` for local dev. Low priority unless exposing the site beyond the home network.
- [ ] **Structured logging:** Optionally persist logs to rolling files or forward to a collector; keep ring buffer for UI if desired.
- [ ] **Replace default Vite README** in `frontend/wk-frontend` with a pointer to the root `README.md` or project-specific notes.

## Optional (product)

- [ ] **Rate limiting** on expensive endpoints (`refresh`, refetch) if abuse becomes a concern.
- [ ] **Health check** endpoint (e.g. `/api/health/live`) — `HealthController` was removed per wishlist; add a minimal check if you need probes without DB details.
