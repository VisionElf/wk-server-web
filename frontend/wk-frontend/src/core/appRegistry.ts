import { futureMatchesSubApp } from "../apps/future-matches/subApp";
import { lastTimeSubApp } from "../apps/last-time/subApp";
import { esportSubApp } from "../apps/esport/subApp";

import type { SubAppDefinition, SubAppRegistration } from "./subAppTypes";

/**
 * Ordered list of sub-apps (sidebar + router). Add or remove entries here only.
 */
export const subAppRegistrations: SubAppRegistration[] = [
  esportSubApp,
  lastTimeSubApp,
  futureMatchesSubApp,
];

export const subApps: SubAppDefinition[] = subAppRegistrations.map(
  (r) => r.definition,
);

export const subAppRoutes = subAppRegistrations.map((r) => r.routes);

/** First-time and fallback redirect (keep in sync with router index route). */
export const defaultLandingPath =
  subApps[0].subNav[0] != null
    ? `${subApps[0].pathPrefix}/${subApps[0].subNav[0].id}`
    : subApps[0].pathPrefix;
