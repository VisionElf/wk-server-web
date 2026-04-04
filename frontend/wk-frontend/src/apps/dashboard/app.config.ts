import type { SubAppDefinition } from "../../core/subAppTypes";

export const dashboardApp: SubAppDefinition = {
  id: "dashboard",
  title: "Dashboard",
  pathPrefix: "/dashboard",
  subNav: [
    { segment: "overview", label: "Overview" },
    { segment: "activity", label: "Activity" },
  ],
};
