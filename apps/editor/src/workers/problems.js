// The Problems worker's work: Core's rules.
import { check } from "statewright";

export const handlers = {
  /** @param {{ doc: object }} payload */
  check: ({ doc }) => check(doc)
};
