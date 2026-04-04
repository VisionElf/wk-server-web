import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const ItemsPage = lazy(() => import("./pages/ItemsPage"));
const HistoryPage = lazy(() => import("./pages/HistoryPage"));

export const lastTimeRoutes: RouteObject = {
  path: "last-time",
  children: [
    { index: true, element: <Navigate to="items" replace /> },
    { path: "items", element: <ItemsPage /> },
    { path: "history", element: <HistoryPage /> },
  ],
};
