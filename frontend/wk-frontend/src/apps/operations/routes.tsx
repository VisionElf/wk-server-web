import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const QueuePage = lazy(() => import("./pages/QueuePage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));

export const operationsRoutes: RouteObject = {
  path: "operations",
  children: [
    { index: true, element: <Navigate to="queue" replace /> },
    { path: "queue", element: <QueuePage /> },
    { path: "history", element: <HistoryPage /> },
    { path: "settings", element: <SettingsPage /> },
  ],
};
