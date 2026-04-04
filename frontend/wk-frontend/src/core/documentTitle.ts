import { subApps } from "./appRegistry";

const BASE_TITLE = "wk-server-web";

/**
 * Browser tab title from the current path, using registered app + sub-nav labels.
 */
export function documentTitleForPath(pathname: string): string {
  const clean = pathname.replace(/\/+$/, "") || "/";
  if (clean === "/console") {
    return `Console · ${BASE_TITLE}`;
  }

  for (const app of subApps) {
    if (!clean.startsWith(app.pathPrefix)) {
      continue;
    }

    const rest = clean.slice(app.pathPrefix.length).replace(/^\//, "");
    if (!rest) {
      const first = app.subNav[0];
      return first
        ? `${first.label} · ${app.title} · ${BASE_TITLE}`
        : `${app.title} · ${BASE_TITLE}`;
    }

    const segment = rest.split("/")[0] ?? "";
    const nav = app.subNav.find((s) => s.segment === segment);
    if (nav) {
      return `${nav.label} · ${app.title} · ${BASE_TITLE}`;
    }

    return `${app.title} · ${BASE_TITLE}`;
  }

  return BASE_TITLE;
}
