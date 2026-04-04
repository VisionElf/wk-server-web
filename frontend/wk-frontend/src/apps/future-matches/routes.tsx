import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const UpcomingPage = lazy(() => import("./pages/UpcomingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const AboutPage = lazy(() => import("./pages/AboutPage"));

export const futureMatchesRoutes: RouteObject = {
  path: "future-matches",
  children: [
    { index: true, element: <Navigate to="upcoming" replace /> },
    { path: "upcoming", element: <UpcomingPage /> },
    { path: "settings", element: <SettingsPage /> },
    { path: "about", element: <AboutPage /> },
  ],
};
