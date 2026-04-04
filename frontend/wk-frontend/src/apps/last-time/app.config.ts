import type { SubAppDefinition } from "../../core/subAppTypes";

export const lastTimeApp: SubAppDefinition = {
  id: "last-time",
  title: "Last time",
  pathPrefix: "/last-time",
  subNav: [
    { segment: "items", label: "Items" },
    { segment: "history", label: "History" },
  ],
};
