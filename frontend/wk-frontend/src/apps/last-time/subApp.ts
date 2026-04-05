import type { SubAppRegistration } from "@/core/subAppTypes";
import { lastTimeApp } from "./app.config";
import { lastTimeRoutes } from "./routes";

export const lastTimeSubApp: SubAppRegistration = {
  definition: lastTimeApp,
  routes: lastTimeRoutes,
};
