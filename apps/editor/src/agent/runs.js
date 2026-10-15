// The Editor host's runs and scenarios (AI interface spec §4.2: simulate and scenarios): the run is the simulation
// panel's own (it opens), the scenarios the document's. What an agent reads of a run is what it reads on a file
// (`runResultOf`, `runStateOf`).
import { AgentError, runResultOf, runStateOf } from "statewright/agent";
import { moves } from "statewright/simulate";

import { hasUnsaved, shownPoint } from "@/simulate/runs";
import { openFor, simulationStore } from "@/simulate/store";
import { editorStore } from "@/store/editor";

import { announce } from "./notice";
import { busy } from "./busy";

const simulation = () => simulationStore.getState();

/** How many steps of the run no scenario holds. */
const unsavedOf = state => state.points.filter((point, index) => index > 0 && point.recorded === undefined).length;

/** The run of the panel, or NOT_ALLOWED. */
function runNow() {
  if (simulation().mode === null)
    throw new AgentError("NOT_ALLOWED", "Nothing is being simulated: run.start starts a run");
  return simulation();
}

/** A run that has started (its first point taken), or NOT_ALLOWED. */
function started() {
  const run = runNow();
  if (!run.points.length)
    throw new AgentError("NOT_ALLOWED", "The run has not started: answer its question (run.answer)");
  return run;
}

/** NOT_ALLOWED when the run shown has steps no scenario holds: the person's work is not thrown away. */
export function keepUnsaved(what) {
  const unsaved = unsavedOf(simulation());
  if (unsaved) {
    throw new AgentError(
      "NOT_ALLOWED",
      `The run has ${unsaved} step(s) no scenario holds: save them (scenario.save) or stop it with discard before ${what}`,
      { unsaved }
    );
  }
}

const result = () => runResultOf(simulation());

export const runOperations = {
  "run.start": (_context, { canvas, ...init }) => {
    const { doc } = editorStore.getState();
    if (!Object.hasOwn(doc.canvases, canvas)) {
      throw new AgentError("NOT_FOUND", `There is no level "${canvas}"; document.summary lists them`, { id: canvas });
    }
    busy();
    keepUnsaved("starting another");
    const before = simulation();
    const values = Object.fromEntries(Object.entries(init).filter(([, value]) => value !== undefined));
    openFor(canvas);
    simulation().begin(values);
    const { points, failure } = simulation();
    if (!points.length && failure) {
      // A start that cannot run leaves the simulation as it was.
      simulationStore.setState(before, true);
      throw new AgentError("INVALID_ARGS", failure.message, { code: failure.code });
    }
    return result();
  },
  "run.moves": () => {
    const point = shownPoint(started());
    return { moves: moves(editorStore.getState().doc, point.session) };
  },
  "run.step": (_context, { do: input }) => {
    started();
    simulation().take(input);
    return result();
  },
  "run.answer": (_context, { value }) => {
    if (!runNow().asking) throw new AgentError("NOT_ALLOWED", "The run asks nothing now");
    simulation().answer(value);
    return result();
  },
  "run.state": () => {
    const run = runNow();
    return runStateOf(run, unsavedOf(run));
  },
  "run.back": () => {
    runNow();
    simulation().back();
    return result();
  },
  "run.stop": (_context, { discard = false }) => {
    if (simulation().mode === null) return { stopped: false };
    if (!discard) keepUnsaved("stopping");
    simulation().close();
    return { stopped: true };
  },
  "scenario.save": ({ agent }, { name, description }) => {
    started();
    const saved = simulation().save({ name, ...(description ? { description } : {}) }, `Save scenario "${name}"`, {
      origin: "ai",
      agent
    });
    if (!saved.ok) throw new AgentError(saved.error.code, saved.error.message, saved.error.details);
    announce(editorStore.getState().history.past.at(-1));
    return { id: saved.created[0] };
  },
  "scenario.present": (_context, { id, step }) => {
    const { doc } = editorStore.getState();
    if (!Object.hasOwn(doc.annotations?.scenarios ?? {}, id)) {
      throw new AgentError("NOT_FOUND", `There is no scenario "${id}"; document.summary counts them`, { id });
    }
    busy();
    if (simulation().mode !== null && hasUnsaved(simulation())) keepUnsaved("presenting a scenario");
    simulation().present(id);
    if (step !== undefined) simulation().stageTo(step);
    const shown = simulation().shown ?? simulation().points.length - 1;
    return { step: shown };
  }
};
