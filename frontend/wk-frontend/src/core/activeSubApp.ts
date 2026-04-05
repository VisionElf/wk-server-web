import type { SubAppDefinition } from "@/core/subAppTypes";

/**
 * Resolves which app owns the current path. Longest prefix wins so nested paths stay unambiguous.
 */
export function getActiveSubApp(
  pathname: string,
  apps: SubAppDefinition[],
): SubAppDefinition | undefined {
  const normalized = pathname.endsWith("/") && pathname !== "/"
    ? pathname.slice(0, -1)
    : pathname;

  const matches = apps.filter(
    (app) =>
      normalized === app.pathPrefix ||
      normalized.startsWith(`${app.pathPrefix}/`),
  );

  if (matches.length === 0) {
    return undefined;
  }

  return matches.sort((a, b) => b.pathPrefix.length - a.pathPrefix.length)[0];
}
