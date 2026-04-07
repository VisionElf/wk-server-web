import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const DaylogHomePage = lazy(() => import("./pages/DaylogHomePage"));

/** Route path must match app.config pathPrefix segment (here: sample-app). */
export const daylogAppRoutes: RouteObject = {
  path: "daylog",
  children: [
    { index: true, element: <Navigate to="home" replace /> },
    { path: "home", element: <DaylogHomePage /> },
  ],
};
