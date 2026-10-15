// The Problems of the open project (spec §8.1): exactly `check(doc)`, for the document version they were computed on.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

/** Severities from the worst. */
export const SEVERITIES = ["error", "warning", "incomplete"];

/** The dot of each severity, as the Problems panel and the guide draw it: red, amber, grey. */
export const SEVERITY_DOT = { error: "bg-danger", warning: "bg-warning", incomplete: "bg-muted" };

const rank = severity => SEVERITIES.indexOf(severity);

/**
 * Counts by severity and the worst one present.
 * @param {Array<{ severity: string }>} problems
 * @returns {{ total: number, error: number, warning: number, incomplete: number, worst: string | null }}
 */
export function summarize(problems) {
  const counts = { total: problems.length, error: 0, warning: 0, incomplete: 0 };
  for (const problem of problems) counts[problem.severity] += 1;
  return { ...counts, worst: SEVERITIES.find(severity => counts[severity] > 0) ?? null };
}

/**
 * The worst severity of the Problems about each element.
 * @returns {Map<string, string>}
 */
export function worstByElement(problems) {
  const worst = new Map();
  for (const { target, severity } of problems) {
    if (!worst.has(target) || rank(severity) < rank(worst.get(target))) worst.set(target, severity);
  }
  return worst;
}

const empty = () => ({ version: null, doc: null, list: [], byElement: new Map() });

export function createProblemsStore() {
  return createStore(set => ({
    ...empty(),
    /** The element a pointer rests on in the Problems panel; the canvas highlights it. */
    highlight: null,
    /** The element the Problems panel is open on ("Show in Problems", from a marker's details); it marks its lines. */
    focus: null,
    /** Store the Problems of a document version (and the document checked, which an agent's answer compares). */
    set: (version, list, doc = null) => set({ version, doc, list, byElement: worstByElement(list) }),
    clear: () => set({ ...empty(), highlight: null, focus: null }),
    setHighlight: id => set({ highlight: id }),
    /** Open the Problems panel on an element, highlighted on the canvas (EditorPage opens the panel). */
    showElement: id => set({ focus: id, highlight: id }),
    setFocus: id => set({ focus: id })
  }));
}

/** The app's Problems. */
export const problemsStore = createProblemsStore();

/** Read the Problems in a component: `useProblems(state => state.list)`. */
export const useProblems = selector => useStore(problemsStore, selector);
