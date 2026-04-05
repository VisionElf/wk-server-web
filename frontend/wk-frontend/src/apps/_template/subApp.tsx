import type { SubAppRegistration } from "@/core/subAppTypes";
import { sampleApp } from "./app.config";
import { sampleAppRoutes } from "./routes";

export const sampleSubApp: SubAppRegistration = {
  definition: sampleApp,
  routes: sampleAppRoutes,
};
