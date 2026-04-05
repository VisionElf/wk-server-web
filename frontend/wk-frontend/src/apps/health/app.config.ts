import type { SubAppDefinition } from "@/core/subAppTypes";

export const healthApp: SubAppDefinition = {
  id: "health",
  title: "Health",
  pathPrefix: "/health",
  subNav: [
    { id: "home", label: "Home" },
  ],
};
