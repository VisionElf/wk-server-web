import { createBrowserRouter, Navigate } from "react-router-dom";
import { dashboardRoutes } from "./apps/dashboard/routes";
import { operationsRoutes } from "./apps/operations/routes";
import { workspaceRoutes } from "./apps/workspace/routes";
import { defaultLandingPath } from "./core/appRegistry";
import NotFoundPage from "./shell/NotFoundPage";
import { AppShell } from "./shell/AppShell";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to={defaultLandingPath} replace /> },
      dashboardRoutes,
      operationsRoutes,
      workspaceRoutes,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
