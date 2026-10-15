// The marks the person makes for the agent (collaboration spec §5): the tool in hand, the colour, what is drawn on
// each level, the elements marked "for the AI", and a sent message's marks shown again. They live until sent, erased
// or the pairing ends: nothing goes to the document, its history or the browser's storage.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** What each colour says (spec §5.1). */
export const MEANING = { red: "wrong", amber: "question", green: "right", neutral: null };
/** The colours, in the picker's order. */
export const COLOURS = ["red", "amber", "green", "neutral"];
/** The tools at the bar's left, in order. */
export const MARK_TOOLS = ["mark", "pencil", "rectangle", "ellipse", "eraser"];
/** The tools that draw (Ctrl/⌘+Z takes their last mark back, the colour picker shows). */
export const DRAWING = new Set(["pencil", "rectangle", "ellipse"]);

/**
 * @typedef {{ id: string, level: string, kind: "stroke" | "rectangle" | "ellipse" | "label",
 *   colour: "red" | "amber" | "green" | "neutral", points?: Array<[number, number]>,
 *   rect?: { x: number, y: number, width: number, height: number }, at?: [number, number], text?: string }} Mark
 */

/** A store of marks; the Editor keeps one (`marksStore`), tests make their own. */
export function createMarksStore() {
  let next = 0;
  return createStore(set => ({
    /** @type {null | "mark" | "pencil" | "rectangle" | "ellipse" | "eraser"} */
    tool: null,
    colour: "red",
    /** @type {Mark[]} */
    marks: [],
    /** @type {Array<{ id: string, level: string }>} */
    forAI: [],
    /** @type {null | { marks: Mark[], forAI: Array<{ id: string, level: string }> }} */
    shown: null,
    setTool: tool => set({ tool }),
    setColour: colour => set({ colour }),
    /** Draw a mark: its ID. */
    add(mark) {
      next += 1;
      const id = `mrk_${next}`;
      set(state => ({ marks: [...state.marks, { ...mark, id }], shown: null }));
      return id;
    },
    remove: id => set(state => ({ marks: state.marks.filter(mark => mark.id !== id) })),
    /** Mark an element for the AI, or unmark it. */
    toggleForAI: (id, level) =>
      set(state => ({
        forAI:
          state.forAI.some(item => item.id === id) ?
            state.forAI.filter(item => item.id !== id)
          : [...state.forAI, { id, level }],
        shown: null
      })),
    unmark: id => set(state => ({ forAI: state.forAI.filter(item => item.id !== id) })),
    /** Take back the last mark drawn: whether there was one. */
    undo() {
      let taken = false;
      set(state => {
        if (!state.marks.length) return {};
        taken = true;
        return { marks: state.marks.slice(0, -1) };
      });
      return taken;
    },
    /** Everything erased (sent, or the eraser's Shift+click); the tool and the colour stay. */
    clear: () => set({ marks: [], forAI: [], shown: null }),
    /** Show a sent message's marks again, or stop showing them. */
    show: snapshot => set({ shown: snapshot })
  }));
}

export const marksStore = createMarksStore();

/** Read the marks in a component. */
export const useMarks = selector => useStore(marksStore, selector);
