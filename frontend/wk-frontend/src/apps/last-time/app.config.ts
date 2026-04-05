import type { SubAppDefinition } from "@/core/subAppTypes";

export const lastTimeApp: SubAppDefinition = {
  id: "last-time",
  title: "Last time",
  pathPrefix: "/last-time",
  subNav: [
    { id: "items", label: "Items" },
    { id: "history", label: "History" },
  ],
};
