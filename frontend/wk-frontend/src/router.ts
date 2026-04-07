import { createElement, lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { defaultLandingPath, subAppRoutes } from "@/core/appRegistry";
import NotFoundPage from "@/shell/NotFoundPage";
import { AppShell } from "@/shell/AppShell";

const ConsolePage = lazy(() => import("./shell/pages/ConsolePage"));

/**
 * No JSX in this file — only `createElement` — so Vite Fast Refresh does not treat it as a
 * "components" module with an incompatible `router` export (see vite-plugin-react).
 */
export const router = createBrowserRouter([
  {
    path: "/",
    element: createElement(AppShell),
    children: [
      {
        index: true,
        element: createElement(Navigate, { to: defaultLandingPath, replace: true }),
      },
      ...subAppRoutes,
      { path: "console", element: createElement(ConsolePage) },
      { path: "*", element: createElement(NotFoundPage) },
    ],
  },
]);
