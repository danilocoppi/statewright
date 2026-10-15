// How a vector's steps read, for findings and failures alike: what a step does, and the states it reaches.

/** What a step does, as a person reads it: the entry or the input it starts with, an event, a call, or time. */
export function doingOf(vector, index) {
  if (index === 0) return vector.start.entry ?? vector.start.input?.event ?? vector.start.input?.call ?? "start";
  const step = vector.steps[index - 1].do;
  return step.event ?? step.call ?? `wait until ${step.until}`;
}

/** Where a step is in its scenario: `Scenario "…", step 2 (guest.arrived)`. */
export const whereOf = (vector, index) =>
  `Scenario "${vector.name}", ${index === 0 ? "start" : `step ${index}`} (${doingOf(vector, index)})`;

/** The states of a step, as a person reads them. */
export const statesOf = active => (active.length ? active.join(", ") : "no state");

/** The same states, in any order. */
export const sameStates = (left, right) =>
  left.length === right.length && [...left].sort().join("\n") === [...right].sort().join("\n");
