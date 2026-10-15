// The marks the person makes for the agent (collaboration spec §5): the tool in hand, the colour, what is drawn on
// each level, the elements marked "for the AI", and a sent message's marks shown again. They live until sent, erased
// or the pairing ends: nothing goes to the document, its history or the browser's storage.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** What each colour says (spec §5.1). */
export const MEANING = { red: "wrong", amber: "question", green: "right", neutral: null };
/** The colours, in the picker's order. */
export const COLOURS = ["red", "amber", "green", "neutral"];
/** Each colour as the Editor's tokens draw it. */
export const INK = { red: "var(--danger)", amber: "var(--warning)", green: "var(--success)", neutral: "var(--ink)" };
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
    /**
     * Marking for an agent's question (spec §6.1): what the Mark tool marks goes to the question, not to the message.
     * @type {null | { question: string, items: Array<{ id: string, level: string }> }}
     */
    picking: null,
    startPicking: question => set({ picking: { question, items: [] }, tool: "mark" }),
    stopPicking: () => set({ picking: null, tool: null }),
    /** Take a tool, or put it down; anything but the Mark tool ends marking for a question. */
    setTool: tool => set(state => ({ tool, ...(tool !== "mark" && state.picking ? { picking: null } : {}) })),
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
      set(state => {
        if (state.picking) {
          const { items } = state.picking;
          return {
            picking: {
              ...state.picking,
              items:
                items.some(item => item.id === id) ? items.filter(item => item.id !== id) : [...items, { id, level }]
            }
          };
        }
        return {
          forAI:
            state.forAI.some(item => item.id === id) ?
              state.forAI.filter(item => item.id !== id)
            : [...state.forAI, { id, level }],
          shown: null
        };
      }),
    /** Erase an element's mark: the question's while marking for one, else the message's. */
    unmark: id =>
      set(state =>
        state.picking ?
          { picking: { ...state.picking, items: state.picking.items.filter(item => item.id !== id) } }
        : { forAI: state.forAI.filter(item => item.id !== id) }
      ),
    /** Take back the last mark drawn on a level (any level without one): whether there was one. */
    undo(level) {
      let taken = false;
      set(state => {
        const at = state.marks.findLastIndex(mark => level === undefined || mark.level === level);
        if (at < 0) return {};
        taken = true;
        return { marks: state.marks.filter((_, index) => index !== at) };
      });
      return taken;
    },
    /** Forget what was sent: those marks and those elements (the ones left out stay). */
    forget: ({ marks, forAI }) =>
      set(state => {
        const marksSent = new Set(marks.map(mark => mark.id));
        const forAISent = new Set(forAI.map(item => item.id));
        return {
          marks: state.marks.filter(mark => !marksSent.has(mark.id)),
          forAI: state.forAI.filter(item => !forAISent.has(item.id)),
          shown: null
        };
      }),
    /** Everything erased (sent, or the eraser's Shift+click); the tool and the colour stay. */
    clear: () => set({ marks: [], forAI: [], shown: null }),
    /** The pairing ended: no marks, no tool in hand. */
    reset: () => set({ marks: [], forAI: [], shown: null, tool: null, picking: null }),
    /** Show a sent message's marks again, or stop showing them. */
    show: snapshot => set({ shown: snapshot })
  }));
}

export const marksStore = createMarksStore();

/** Read the marks in a component. */
export const useMarksState = selector => useStore(marksStore, selector);
