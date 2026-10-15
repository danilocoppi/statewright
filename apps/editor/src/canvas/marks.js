// What the run's marks on the canvas do when clicked (simulator spec §6.3), given by the canvas to its boxes and edges:
// `open(id)` goes down into a box, `edge(id, mark)` takes the move an edge's label stands for.
import { createContext } from "react";

export const MarkActions = createContext({ open: () => {}, edge: () => {} });
