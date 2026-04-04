import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const OverviewPage = lazy(() => import("./pages/OverviewPage"));
const ActivityPage = lazy(() => import("./pages/ActivityPage"));

export const dashboardRoutes: RouteObject = {
  path: "dashboard",
  children: [
    { index: true, element: <Navigate to="overview" replace /> },
    { path: "overview", element: <OverviewPage /> },
    { path: "activity", element: <ActivityPage /> },
  ],
};
