import type { SubAppDefinition } from "@/core/subAppTypes";

export const daylogApp: SubAppDefinition = {
  id: "daylog",
  title: "Daylog",
  pathPrefix: "/daylog",
  subNav: [
    { id: "home", label: "Daylog" },
  ],
};
