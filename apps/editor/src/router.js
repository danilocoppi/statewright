// Routes (spec §4.6). Every page is loaded on demand (one chunk per page).
import { createBrowserRouter } from "react-router";

import { ScreenLoading } from "@/components/ScreenLoading";
import { ErrorPage } from "@/pages/ErrorPage";

/** Adapt a page module's default export to React Router's `lazy`. */
const page = load => async () => ({ Component: (await load()).default });

const routes = [
  {
    HydrateFallback: ScreenLoading,
    ErrorBoundary: ErrorPage,
    children: [
      { path: "/", lazy: page(() => import("@/features/projects/ProjectsPage")) },
      { path: "/p/:projectId/:canvasId?", lazy: page(() => import("@/features/editor/EditorPage")) },
      { path: "/readme", lazy: page(() => import("@/guide/GuidePage")) },
      { path: "*", lazy: page(() => import("@/pages/NotFound")) }
    ]
  }
];

// The app is served under the platform's path when it has one (VITE_BASE_URL); its routes are below it.
export const router = createBrowserRouter(routes, { basename: import.meta.env.BASE_URL });
