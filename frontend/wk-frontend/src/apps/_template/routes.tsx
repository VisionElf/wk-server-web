import { lazy } from "react";
import { Navigate, type RouteObject } from "react-router-dom";

const SampleHomePage = lazy(() => import("./pages/SampleHomePage"));
const SampleExtraPage = lazy(() => import("./pages/SampleExtraPage"));

/** Route path must match app.config pathPrefix segment (here: sample-app). */
export const sampleAppRoutes: RouteObject = {
  path: "sample-app",
  children: [
    { index: true, element: <Navigate to="home" replace /> },
    { path: "home", element: <SampleHomePage /> },
    { path: "extra", element: <SampleExtraPage /> },
  ],
};
