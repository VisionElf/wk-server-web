import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { defaultLandingPath, subAppRoutes } from "@/core/appRegistry";
import NotFoundPage from "@/shell/NotFoundPage";
import { AppShell } from "@/shell/AppShell";

const ConsolePage = lazy(() => import("./shell/pages/ConsolePage"));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={defaultLandingPath} replace /> },
      ...subAppRoutes,
      { path: "console", element: <ConsolePage /> },
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
