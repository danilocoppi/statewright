import "@/globals.css";
import "@/i18n";
import "@/stores/theme";
import "@/agent/install";

import { StrictMode, Suspense } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router/dom";

import { HandOverDialog } from "@/agent/HandOverDialog";
import { ScreenLoading } from "@/components/ScreenLoading";
import { Toaster } from "@/components/ui/Toaster";
import { registerFonts } from "@/design/fonts";
import { router } from "@/router";

registerFonts();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {/* Suspense: i18n loads the language's JSON files on the first render. */}
    <Suspense fallback={<ScreenLoading />}>
      <RouterProvider router={router} />
      <Toaster />
      <HandOverDialog />
    </Suspense>
  </StrictMode>
);
