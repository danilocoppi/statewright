// Refusals in plain words (spec §10): what the canvas will not do, and Core's error codes, each with a sentence of
// `editor:refusals`. Core's own message stays available under "More".
import { ERROR_CODES } from "statewright";

/** Refusals the canvas makes before asking Core (see connect.js, clipboard.js), and a layout that could not be made. */
const CANVAS = [
  "elsewhere",
  "intoStart",
  "fromTerminal",
  "initialOnce",
  "crossRegion",
  "secondInitial",
  "wrongKind",
  "missingLevel",
  "arrangeFailed",
  // A guest's connections, and a role's connector (mixed levels spec §3).
  "guest",
  "noMeaning",
  "already",
  "notRun",
  "nothingToReceive"
];

const KNOWN = new Set([...CANVAS, ...ERROR_CODES, "READ_ONLY"]);

/** The `editor:refusals` key for a reason; unknown reasons get the general sentence. */
export const refusalKey = reason => `refusals.${KNOWN.has(reason) ? reason : "other"}`;
