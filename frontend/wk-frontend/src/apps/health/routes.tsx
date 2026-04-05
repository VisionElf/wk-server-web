import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const HealthHomePage = lazy(() => import("./pages/HealthHomePage"));

/** Route path must match app.config pathPrefix segment (here: sample-app). */
export const healthAppRoutes: RouteObject = {
  path: "health",
  children: [
    { index: true, element: <Navigate to="home" replace /> },
    { path: "home", element: <HealthHomePage /> },
  ],
};
