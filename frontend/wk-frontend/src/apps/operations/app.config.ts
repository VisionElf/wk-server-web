import type { SubAppDefinition } from "../../core/subAppTypes";

export const operationsApp: SubAppDefinition = {
  id: "operations",
  title: "Operations",
  pathPrefix: "/operations",
  subNav: [
    { segment: "queue", label: "Queue" },
    { segment: "history", label: "History" },
    { segment: "settings", label: "Settings" },
  ],
};
