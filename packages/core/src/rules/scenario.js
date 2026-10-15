import { replay } from "../simulate/index.js";
import { sorted } from "./facts.js";

/** Why a step diverged, in words. */
const WHY = {
  reached: "it reaches other states",
  question: "it asks a question the recording does not answer",
  answers: "it no longer asks what the recording answered",
  error: "it can no longer be taken"
};

/** Scenario rules (simulator spec §4.6). */
export default [
  {
    code: "scenario.diverged",
    severity: "warning",
    description: "Running a saved scenario again no longer gives what it recorded.",
    check(facts, report) {
      for (const [id, scenario] of sorted(facts.doc.annotations?.scenarios)) {
        const { first, start, steps } = replay(facts.doc, scenario);
        if (first === null) continue;
        const { reason, message } = first === 0 ? start : steps[first - 1];
        const where = first === 0 ? "at its start" : `at step ${first}`;
        // The engine's own words, when it stopped, say what to change (a missing event, a run that never settles).
        const why = message ? `${WHY[reason]}. ${message[0].toUpperCase()}${message.slice(1)}` : WHY[reason];
        report({
          target: id,
          canvas: scenario.canvas,
          message: `${facts.describe(id)} goes elsewhere ${where}: ${why}`,
          data: { step: first, reason }
        });
      }
    }
  }
];
