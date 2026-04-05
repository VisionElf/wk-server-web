import type { SubAppRegistration } from "@/core/subAppTypes";
import { healthApp } from "./app.config";
import { healthAppRoutes } from "./routes";

export const healthSubApp: SubAppRegistration = {
  definition: healthApp,
  routes: healthAppRoutes,
};
