import type { SubAppRegistration } from "../../core/subAppTypes";
import { futureMatchesApp } from "./app.config";
import { futureMatchesRoutes } from "./routes";

export const futureMatchesSubApp: SubAppRegistration = {
  definition: futureMatchesApp,
  routes: futureMatchesRoutes,
};
