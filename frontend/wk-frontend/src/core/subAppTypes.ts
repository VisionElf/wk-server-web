/** One tab / section inside a sub-app (top navigation). */
export type SubAppNavItem = {
  segment: string;
  label: string;
};

/** Metadata for a sub-app: sidebar entry + sub-nav. Keep routes in sync with `segment` values. */
export type SubAppDefinition = {
  id: string;
  title: string;
  /** URL prefix, e.g. `/dashboard`. Must be unique across apps. */
  pathPrefix: string;
  /** Sections for the top bar; empty = no top bar for that app. */
  subNav: SubAppNavItem[];
};
