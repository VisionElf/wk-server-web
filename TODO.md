# TODO — improvements backlog

Prioritized suggestions derived from code review. Adjust order to match your deployment and risk tolerance.

## User Wishlist

- [ ] change folder hierarchy (ie: WkApi/Apps/XXX/Controllers instead of WkApi/Controllers)
- [ ] Separate Liquipedia parser into a different modules (ie: Apps/XXX/Lib/Crawler/Liquipedia)
- [ ] Remove unused stuff (ie: Healthcontroller, example apps etc...)
- [ ] If applicable, create a SECRETS.md file that explains WHAT secrets are used and by who and WHERE should it be configured
- [ ] if frontend/package-lock.json is not used, remove it
- [ ] Remove any non-used config/other files
- [ ] Update the browser title with corresponding name
- [ ] For tsx files: Separate renderers & logic code (when possible)
- [ ] Refactor as much duplicated code as possible (c# / ts / tsx / css)
- [ ] Comments Dockerfile with explanations on what it does
- [ ] Try to keep the CSS as much as global as possible, create css per pages and not per app (when needed)
- [ ] Refactor/Reorganize FutureMatches c# scripts. Remove FutureMatches name when not logical, when you remove the name you must think "what it does, where does it go", if its a utility script or something like this try placing it inside a Lib/ folder (or anything similar) - place together similar scripts
- [ ] Create global utility scripts & global API usage (i.e. upload a file should be something that all apps can use)

## Lower priority (quality & DX)

- [ ] **Structured logging:** Optionally persist logs to rolling files or forward to a collector; keep ring buffer for UI if desired.
- [ ] **Replace default Vite README** in `frontend/wk-frontend` with a pointer to the root `README.md` or project-specific notes.

## Optional (product)

- [ ] **Rate limiting** on expensive endpoints (`refresh`, refetch) if abuse becomes a concern.
- [ ] **Health check** endpoint that does not expose internal DB details when `ASPNETCORE_ENVIRONMENT` is Production.
