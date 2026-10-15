// A Problems marker's details (ProblemMarker on a box, FigureEdge's hit area on an edge, each marked with its element):
// which element's Problems are shown. In a store, so Esc can close them before it does anything else (hover.js).
import { createHoverStore } from "./hover";

/** The marker whose element's Problems are shown (`shown`: its element and where it is in the window, or null). */
export const problemStore = createHoverStore();
