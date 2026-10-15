// The simulation of the open project (simulator spec §6): what the panel shows and the canvas marks. It lives in memory
// only, beside the document, which a run never changes; saving a run as a scenario is a change of the document like
// any other (`dispatch`), undoable once the simulation is over.
import { useStore } from "zustand";
import { createStore } from "zustand/vanilla";

import { editingStore } from "@/editing/state";
import { editorStore } from "@/store/editor";

import {
  IDLE,
  acceptAt,
  accepted,
  answer,
  back,
  begin,
  captioned,
  continueFrom,
  dismiss,
  follow,
  followTo,
  hasUnsaved,
  next,
  opening,
  presented,
  restart,
  saved,
  scenarioOf,
  show,
  stopFollowing,
  take
} from "./runs";
import { payloadTypeOf } from "./words";

/** The open document. */
const docNow = () => editorStore.getState().doc;

export const simulationStore = createStore((set, get) => {
  /** Apply one of the run's pure steps to the state as it is now. */
  const update = change => set(state => change(state));
  return {
    ...IDLE,
    /**
     * @type {{ kind: "payload", input: object, label: string } | { kind: "wait" } | null} What the panel asks for
     *   before an input is taken, in the moves' place: what it carries, or how long to wait.
     */
    card: null,
    /** @type {null | "stop" | "restart" | { scenario: string, step: number }} Leaving a run with steps no scenario holds: what was asked for, until the
     *  person says whether to save them first (spec §6.1). */
    leaving: null,
    /** The Save as scenario dialog is open. */
    saving: false,
    /** The run is presented on the stage (simulator spec §7.1), the point shown as its step. */
    stage: false,
    /** The point the stage plays, when it moved on to it by one; null when it shows a point at once. */
    played: null,

    /** Show the Start panel for a top executable canvas. */
    open: canvas => set({ ...opening(canvas), card: null, leaving: null, saving: false, stage: false }),
    /** Leave the simulation: the panel closes and the marks go. */
    close: () => set({ ...IDLE, card: null, leaving: null, saving: false, stage: false }),
    /**
     * Present a scenario on the stage (simulator spec §7.1): from its row (`id`) at its start, or the one the run
     * follows at the point shown — every step it still has to take taken first.
     * @param {string | null} [id]
     */
    present: (id = null) =>
      update(state => ({ ...presented(docNow(), state, id), card: null, stage: true, played: null })),
    /** Show another point on the stage, within the run's ends; moving on by one plays it (simulator spec §7.1). */
    stageTo(index) {
      const { shown, points } = get();
      const target = Math.max(0, Math.min(points.length - 1, index));
      set({ ...show(get(), target), played: target === (shown ?? points.length - 1) + 1 ? target : null });
    },
    /** Back from the stage to the panel, at the same point (simulator spec §7.1: Esc). */
    leaveStage: () => set({ stage: false }),
    /**
     * Stop (spec §6.1), start over, or open a scenario at a step (a Problem's row): at once, or — with steps not saved —
     * once the person has said whether to save them. @returns {boolean} whether it was done at once.
     * @param {"stop" | "restart" | { scenario: string, step: number }} action
     */
    leave(action) {
      if (hasUnsaved(get())) {
        set({ leaving: action });
        return false;
      }
      get().carryOut(action);
      return true;
    },
    /** Do what was asked to leave the run for. */
    carryOut(action) {
      if (action === "stop") get().close();
      else if (action === "restart") get().restart();
      else if (action?.scenario) {
        get().close();
        get().followTo(action.scenario, action.step);
      }
    },
    /** Leave without saving what was asked to leave. */
    discard() {
      const action = get().leaving;
      set({ leaving: null, saving: false });
      get().carryOut(action);
    },
    /** Keep the run: what was asked to leave is not done. */
    stay: () => set({ leaving: null, saving: false }),
    /** Open or close the Save as scenario dialog. */
    setSaving: saving => set({ saving }),
    /** Ask for what an input needs before it is taken, or stop asking. */
    setCard: card => set({ card }),
    /**
     * Take an input from the panel or the canvas: at once, or through its payload card when it carries a typed value
     * (spec §6.2).
     */
    request(input, label) {
      if (payloadTypeOf(docNow(), input)) set({ card: { kind: "payload", input, label } });
      else get().take(input);
    },
    begin: init => update(state => begin(docNow(), state, init)),
    restart: () => update(state => restart(docNow(), state)),
    take: input => update(state => take(docNow(), state, input)),
    answer: value => update(state => answer(docNow(), state, value)),
    dismiss: () => update(dismiss),
    back: () => update(back),
    show: index => update(state => show(state, index)),
    continueFrom: () => update(continueFrom),
    follow: id => update(state => follow(docNow(), state, id)),
    followTo: (id, step) => update(state => followTo(docNow(), state, id, step)),
    next: () => update(state => next(docNow(), state)),
    stopFollowing: () => update(stopFollowing),

    /**
     * Save the run as a new scenario (spec §6.4); the run is then that scenario's.
     * @param {{ name: string, description?: string }} about
     * @param {string} label The change's name in the undo history.
     * @param {{ origin?: "user" | "ai", agent?: string }} [by] Who saves it: an agent's change is recorded as its own.
     * @returns {import("@/store/editor").DispatchResult}
     */
    save(about, label, by = {}) {
      const scenario = scenarioOf(get(), about);
      const result = editorStore.getState().dispatch([{ type: "scenario.add", args: { scenario } }], { label, ...by });
      if (!result.ok) return result;
      // Saved on the way out: what was asked for is done now.
      const action = get().leaving;
      set({ ...saved(get(), result.created[0], scenario), saving: false, leaving: null });
      get().carryOut(action);
      return result;
    },

    /**
     * Write a step's caption; a saved step's caption is stored in its scenario.
     * @returns {import("@/store/editor").DispatchResult | null} null when nothing was stored.
     */
    caption(index, text, label) {
      const { state, steps } = captioned(get(), index, text);
      if (!steps) {
        set(state);
        return null;
      }
      const id = get().script.id;
      const result = editorStore
        .getState()
        .dispatch([{ type: "scenario.update", args: { id, set: { steps } } }], { label });
      if (result.ok) set(state);
      return result;
    },

    /** What accepting the new path at a point would store, and how many later steps it would drop. */
    preview: index => acceptAt(docNow(), get(), index),

    /**
     * Accept the new path at a point (spec §6.4): the scenario's recording becomes what the design does now.
     * @returns {import("@/store/editor").DispatchResult}
     */
    accept(index, label) {
      const change = acceptAt(docNow(), get(), index);
      const id = get().script.id;
      const result = editorStore
        .getState()
        .dispatch([{ type: "scenario.update", args: { id, set: { start: change.start, steps: change.steps } } }], {
          label
        });
      if (result.ok) set(accepted(get(), change));
      return result;
    }
  };
});

/** Read the simulation in a component: `useSimulation(state => state.mode)`. */
export const useSimulation = selector => useStore(simulationStore, selector);

/**
 * Open the Start panel for a top canvas (spec §6.1): the tool in hand is put down and the selection cleared, as the
 * document is not edited while simulating.
 */
export function openFor(canvas) {
  editingStore.getState().reset();
  editorStore.getState().select([]);
  simulationStore.getState().open(canvas);
}

/**
 * Run a saved scenario up to a step (spec §6.4: a Problem's row opens the scenario at that step) — once the person has
 * said what becomes of steps the run shown has not saved.
 */
export function openScenario(id, step = 0) {
  editingStore.getState().reset();
  editorStore.getState().select([]);
  simulationStore.getState().leave({ scenario: id, step });
}

// While simulating, the document is not edited (spec §6.1): only a scenario's commands and the editor's own placing of
// boxes go through, and undo waits until the simulation is over.
editorStore
  .getState()
  .holdWhile(
    (commands, { record } = {}) =>
      simulationStore.getState().mode !== null &&
      (commands === null || (record !== false && !commands.every(command => command.type.startsWith("scenario."))))
  );

/** Whether a simulation is open (the Start panel or a run): the document is not edited meanwhile. */
export const isSimulating = () => simulationStore.getState().mode !== null;
