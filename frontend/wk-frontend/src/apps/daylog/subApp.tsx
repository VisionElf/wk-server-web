import type { SubAppRegistration } from "@/core/subAppTypes";
import { daylogApp } from "./app.config";
import { daylogAppRoutes } from "./routes";

export const daylogSubApp: SubAppRegistration = {
  definition: daylogApp,
  routes: daylogAppRoutes,
};
