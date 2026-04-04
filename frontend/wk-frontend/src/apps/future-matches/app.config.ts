import type { SubAppDefinition } from "../../core/subAppTypes";

export const futureMatchesApp: SubAppDefinition = {
  id: "future-matches",
  title: "Matches",
  pathPrefix: "/future-matches",
  subNav: [
    { segment: "upcoming", label: "Upcoming" },
    { segment: "about", label: "About" },
  ],
};
