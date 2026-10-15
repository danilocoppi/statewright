// Running a scenario again (simulator spec §4.6, §5.2): the same start and inputs, with the recorded answers, compared
// step by step with what was recorded.

/** Do two recordings say the same: the same active states and the same ending? */
const same = (a, b) =>
  a.active.length === b.active.length &&
  a.active.every((path, index) => path === b.active[index]) &&
  a.ended === b.ended;

/** Why a step that did not finish diverges: a question the recording does not answer, answers left over, an error. */
function reasonOf(result) {
  if (result.status === "needs" || result.code === "badAnswer") return "question";
  if (result.code === "extraAnswers") return "answers";
  return "error";
}

/**
 * Run a scenario again and compare each step with its recording. A step that cannot be taken (a question not answered
 * by the recording, an error) diverges, and the steps after it are skipped.
 * @param {any} doc
 * @param {object} scenario
 * @param {{ start: Function, step: Function, reachedOf: Function }} engine
 * @returns {{ start: { status: "same" | "diverged", reason?: string, message?: string },
 *   steps: Array<{ status: "same" | "diverged" | "skipped", recorded: object, now?: object, reason?: string, message?: string }>,
 *   first: number | null }} `first` is the first diverging step's number (1 for the first step, 0 for the start).
 */
export function replayOf(doc, scenario, { start, step, reachedOf }) {
  const out = { start: { status: "same" }, steps: [], first: null };
  const begun = start(doc, { canvas: scenario.canvas, ...scenario.start });
  let session = begun.status === "done" ? begun.session : null;
  if (!session) {
    out.start = { status: "diverged", reason: reasonOf(begun), ...(begun.message ? { message: begun.message } : {}) };
    out.first = 0;
  }
  scenario.steps.forEach((recorded, index) => {
    if (!session) {
      out.steps.push({ status: "skipped", recorded: recorded.reached });
      return;
    }
    const result = step(doc, session, { do: recorded.do, answers: recorded.answers ?? [] });
    if (result.status === "done") {
      const now = reachedOf(result.session);
      const kept = same(now, recorded.reached);
      out.steps.push({
        status: kept ? "same" : "diverged",
        recorded: recorded.reached,
        now,
        ...(kept ? {} : { reason: "reached" })
      });
      session = result.session;
    } else {
      out.steps.push({
        status: "diverged",
        recorded: recorded.reached,
        reason: reasonOf(result),
        ...(result.message ? { message: result.message } : {})
      });
      session = null;
    }
    if (out.first === null && out.steps.at(-1).status === "diverged") out.first = index + 1;
  });
  return out;
}
