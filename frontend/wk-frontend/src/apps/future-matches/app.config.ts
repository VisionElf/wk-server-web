import type { SubAppDefinition } from "@/core/subAppTypes";

export const futureMatchesApp: SubAppDefinition = {
  id: "future-matches",
  title: "Matches",
  pathPrefix: "/future-matches",
  subNav: [
    { id: "upcoming", label: "Upcoming" },
    { id: "settings", label: "Follow" },
    { id: "page-cache", label: "Page cache" },
    { id: "about", label: "About" },
  ],
};
