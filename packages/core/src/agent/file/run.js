// The file host's runs (AI interface spec §4.2: simulate and scenarios): one run per file, kept in the host's memory as
// the Editor's panel keeps its own — the start, then each step, each with the session it reached. A question stops a
// step until it is answered; a step that cannot be taken leaves the run where it was, with why.
import { moves, reachedOf, start, step } from "../../simulate/index.js";
import { runResultOf, runStateOf } from "../run-view.js";
import { AgentError } from "../errors.js";
import { change } from "./edit.js";

/** The file's run, or NOT_ALLOWED. */
function runOf(session) {
  if (!session.run) throw new AgentError("NOT_ALLOWED", "There is no run on this file; run.start starts one");
  return session.run;
}

/** Start the run (`input` null) or take an input from the last point, with these answers; then settle on the result. */
function attempt(doc, run, input, answers) {
  const result =
    input === null ?
      start(doc, { canvas: run.canvas, ...run.init, answers })
    : step(doc, run.points.at(-1).session, { do: input, answers });
  run.asking = null;
  run.failure = null;
  if (result.status === "needs") run.asking = { do: input, answers, question: result.question };
  else if (result.status === "error") {
    const { code, message, details } = result;
    run.failure = { do: input, code, message, ...(details ? { details } : {}) };
  } else run.points.push({ do: input, answers, session: result.session });
  return runResultOf(run);
}

/** The steps no scenario holds: those after the last save. */
const unsavedOf = run => Math.max(0, run.points.length - 1 - run.saved);

export const runOperations = {
  "run.start": (session, { canvas, ...init }) => {
    const { doc } = session;
    if (!doc.canvases[canvas]) {
      throw new AgentError("NOT_FOUND", `There is no level "${canvas}"; document.summary lists them`, { id: canvas });
    }
    const run = { canvas, init, points: [], asking: null, failure: null, saved: 0 };
    const result = attempt(doc, run, null, []);
    if (run.failure) throw new AgentError("INVALID_ARGS", run.failure.message, { code: run.failure.code });
    session.run = run;
    return result;
  },
  "run.moves": session => {
    const run = runOf(session);
    if (!run.points.length) return { moves: [] };
    return { moves: moves(session.doc, run.points.at(-1).session) };
  },
  "run.step": (session, { do: input }) => {
    const run = runOf(session);
    if (!run.points.length)
      throw new AgentError("NOT_ALLOWED", "Answer the question the start asks first (run.answer)");
    return attempt(session.doc, run, input, []);
  },
  "run.answer": (session, { value }) => {
    const run = runOf(session);
    const { asking } = run;
    if (!asking) throw new AgentError("NOT_ALLOWED", "The run asks nothing now");
    const answers = [...asking.answers, { kind: asking.question.kind, at: asking.question.at, value }];
    return attempt(session.doc, run, asking.do, answers);
  },
  "run.state": session => {
    const run = runOf(session);
    return runStateOf(run, unsavedOf(run));
  },
  "run.back": session => {
    const run = runOf(session);
    if (run.asking || run.failure) {
      run.asking = null;
      run.failure = null;
    } else if (run.points.length > 1) {
      run.points.pop();
      run.saved = Math.min(run.saved, run.points.length - 1);
    }
    return runResultOf(run);
  },
  "run.stop": (session, { discard = false }) => {
    if (!session.run) return { stopped: false };
    const unsaved = unsavedOf(session.run);
    if (unsaved && !discard) {
      throw new AgentError(
        "NOT_ALLOWED",
        `The run has ${unsaved} step(s) no scenario holds: save them (scenario.save) or stop with discard`,
        { unsaved }
      );
    }
    session.run = null;
    return { stopped: true };
  },
  "scenario.save": (session, { name, description }) => {
    const run = runOf(session);
    if (!run.points.length)
      throw new AgentError("NOT_ALLOWED", "The run has not started yet: answer its question first");
    const recordedOf = point => ({
      do: point.do,
      ...(point.answers.length ? { answers: point.answers } : {}),
      reached: reachedOf(point.session)
    });
    const startAnswers = run.points[0].answers;
    const scenario = {
      name,
      ...(description ? { description } : {}),
      canvas: run.canvas,
      start: { ...run.init, ...(startAnswers.length ? { answers: startAnswers } : {}) },
      steps: run.points.slice(1).map(recordedOf)
    };
    const { result } = change(session, [{ type: "scenario.add", args: { scenario } }], `Save scenario "${name}"`);
    run.saved = run.points.length - 1;
    return { id: result.created[0] };
  }
};
