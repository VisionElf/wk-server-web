Copy-paste template for a new sub-app (not wired into the router).

Steps:
1. Duplicate this folder as src/apps/<your-app-slug>/ (do not keep the leading underscore).
2. In app.config.ts: set id, title, pathPrefix (e.g. /my-app), and subNav segments + labels.
3. In routes.tsx: set path to match the URL segment after / (same as pathPrefix without leading slash).
4. Rename pages and lazy imports; add one route child per subNav segment (or a single child if subNav is empty).
5. Add src/apps/<your-app-slug>/subApp.ts exporting a SubAppRegistration (definition + routes), then import it in src/core/appRegistry.ts and append to subAppRegistrations (single list for sidebar and router).
6. Backend (optional): add API under WkApi/Apps/<YourApp>/ (controllers, services), EF entities under Apps/<YourApp>/Entities/ and DbSet registration in Data/AppDbContext.cs — same pattern as Apps/LastTime.

Shared UI classes live in src/ui.css (imported from main.tsx). Prefer ui-page-header, ui-lead, ui-btn, ui-card, ui-field, ui-table, etc., so pages match the global design tokens in index.css.

The shell shows sidebar entries from appRegistry and top tabs from the active app’s subNav, so segment strings must match route paths.
