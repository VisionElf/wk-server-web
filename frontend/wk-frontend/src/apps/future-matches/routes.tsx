import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const UpcomingPage = lazy(() => import("./pages/UpcomingPage"));
const PageCachePage = lazy(() => import("./pages/PageCachePage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

export const futureMatchesRoutes: RouteObject = {
  path: "future-matches",
  children: [
    { index: true, element: <Navigate to="upcoming" replace /> },
    { path: "upcoming", element: <UpcomingPage /> },
    { path: "page-cache", element: <PageCachePage /> },
    { path: "settings", element: <SettingsPage /> },
    { path: "about", element: <AboutPage /> },
  ],
};
