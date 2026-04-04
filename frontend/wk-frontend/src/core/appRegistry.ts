import { dashboardApp } from "../apps/dashboard/app.config";
import { futureMatchesApp } from "../apps/future-matches/app.config";
import { lastTimeApp } from "../apps/last-time/app.config";
import { operationsApp } from "../apps/operations/app.config";
import type { SubAppDefinition } from "./subAppTypes";

/**
 * Ordered list of sub-apps (sidebar). Add new apps here and register their routes in `router.tsx`.
 */
export const subApps: SubAppDefinition[] = [
  dashboardApp,
  operationsApp,
  lastTimeApp,
  futureMatchesApp,
];

/** First-time and fallback redirect (keep in sync with router index route). */
export const defaultLandingPath =
  subApps[0].subNav[0] != null
    ? `${subApps[0].pathPrefix}/${subApps[0].subNav[0].segment}`
    : subApps[0].pathPrefix;
