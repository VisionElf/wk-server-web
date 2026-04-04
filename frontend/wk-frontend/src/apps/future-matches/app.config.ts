import type { SubAppDefinition } from "../../core/subAppTypes";

export const futureMatchesApp: SubAppDefinition = {
  id: "future-matches",
  title: "Matches",
  pathPrefix: "/future-matches",
  subNav: [
    { segment: "upcoming", label: "Upcoming" },
    { segment: "settings", label: "Follow" },
    { segment: "page-cache", label: "Page cache" },
    { segment: "about", label: "About" },
  ],
};
