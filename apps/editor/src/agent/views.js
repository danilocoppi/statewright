// The Editor host's navigating and showing (AI interface spec §4.2: navigate and show; §7.3): the level shown, the
// selection, an element brought into view, the level framed, elements pointed out with a note. They move what the
// person sees, so they wait while a dialog of the person's is open (BUSY), and never take the focus. What is brought
// into view or pointed out rings for a moment, as what a link leads to does (canvas/beacon.js).
import { buildIndex } from "statewright";
import { AgentError } from "statewright/agent";

import { beacon } from "@/canvas/beacon";
import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import { busy } from "./busy";
import { noticeStore } from "./notice";

const docNow = () => editorStore.getState().doc;

/** A level of the open document, or NOT_FOUND. */
function level(id) {
  if (!Object.hasOwn(docNow().canvases, id)) {
    throw new AgentError("NOT_FOUND", `There is no level "${id}"; document.summary lists them`, { id });
  }
  return id;
}

/** The level an element is drawn on, or NOT_FOUND. */
function levelOf(index, id) {
  const entry = index.get(id);
  if (!entry?.canvas) {
    throw new AgentError("NOT_FOUND", `There is no element "${id}" on a level; query.find looks for one by name`, {
      id
    });
  }
  return entry.canvas;
}

/** The one level all these elements are on, or INVALID_ARGS. */
function sharedLevel(ids) {
  const index = buildIndex(docNow());
  const levels = [...new Set(ids.map(id => levelOf(index, id)))];
  if (levels.length > 1) {
    throw new AgentError(
      "INVALID_ARGS",
      `These elements are on different levels (${levels.join(", ")}): give those of one`,
      {
        levels
      }
    );
  }
  return levels[0];
}

/** Show a level, as the person would by opening it. */
const show = id => {
  editorStore.getState().setCanvas(id);
  return id;
};

export const viewOperations = {
  "view.open": (_context, { canvas }) => {
    busy();
    return { canvas: show(level(canvas)) };
  },
  "view.select": (_context, { ids }) => {
    busy();
    const canvas = show(sharedLevel(ids));
    editorStore.getState().select(ids, canvas);
    return { canvas };
  },
  "view.reveal": (_context, { id }) => {
    busy();
    const canvas = show(sharedLevel([id]));
    editorStore.getState().reveal(canvas, id);
    beacon(canvas, [id]);
    return { canvas };
  },
  "view.fit": () => {
    busy();
    editingStore.getState().zoom("fit");
    return { canvas: editorStore.getState().canvasId };
  },
  "view.point": (_context, { ids, note }) => {
    busy();
    const canvas = show(sharedLevel(ids));
    noticeStore.setState({ pointed: { canvasId: canvas, ids, ...(note ? { note } : {}) } });
    beacon(canvas, ids);
    return { canvas };
  }
};
