import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const BoardPage = lazy(() => import("./pages/BoardPage"));
const FilesPage = lazy(() => import("./pages/FilesPage"));

export const workspaceRoutes: RouteObject = {
  path: "workspace",
  children: [
    { index: true, element: <Navigate to="board" replace /> },
    { path: "board", element: <BoardPage /> },
    { path: "files", element: <FilesPage /> },
  ],
};
