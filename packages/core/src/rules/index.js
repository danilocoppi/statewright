import canvasRules from "./canvases.js";
import catalogRules from "./catalog.js";
import commentRules from "./comments.js";
import { compareText, createFacts } from "./facts.js";
import flowRules from "./flow.js";
import layoutRules from "./layout.js";
import machineRules from "./machine.js";
import mixedRules from "./mixed.js";
import referenceRules from "./references.js";
import roleRules from "./roles.js";
import scenarioRules from "./scenario.js";
import { typedView } from "../roles/typed.js";

/**
 * @typedef {object} Problem A structural finding about a document (spec §22).
 * @property {string} code Rule code, e.g. "machine.unreachable"; doubles as the Editor's i18n key.
 * @property {"error"|"warning"|"incomplete"} severity
 * @property {string} target ID of the element the problem is about.
 * @property {string} [canvas] Canvas the target lives on (or is).
 * @property {string} message English explanation.
 * @property {object} [data] Machine-readable details.
 */

/**
 * @typedef {object} Rule
 * @property {string} code
 * @property {"error"|"warning"|"incomplete"|"by level"} severity "by level" follows the canvas `transitions` level.
 * @property {string} description One line, for the README and the CLI.
 * @property {(facts: ReturnType<typeof createFacts>, report: (problem: Omit<Problem, "code"|"severity"> & { severity?: Problem["severity"] }) => void) => void} check
 */

/**
 * Rules that judge what a level runs as: they read mixed levels as the typed levels they run as (mixed levels spec
 * §4.5: "the machine rules apply to the machine part, the flow rules to the flows").
 */
const TYPED = new Set([...machineRules, ...flowRules]);

/** @type {Rule[]} Every rule, in report order. */
const RULES = [
  ...referenceRules,
  ...canvasRules,
  ...machineRules,
  ...flowRules,
  ...mixedRules,
  ...roleRules,
  ...catalogRules,
  ...layoutRules,
  ...scenarioRules,
  ...commentRules
];

/**
 * Every rule with its code, severity and description.
 * @returns {Array<{ code: string, severity: string, description: string }>}
 */
export function listRules() {
  return RULES.map(({ code, severity, description }) => ({ code, severity, description }));
}

/**
 * Structural analysis of a document (spec §22). Pure: the same document always gives the same Problems, ordered by
 * rule, then target, then message.
 * @param {any} doc A schema-valid document (see parse).
 * @returns {Problem[]}
 */
export function check(doc) {
  const facts = createFacts(doc);
  const view = typedView(doc);
  const typedFacts = view === doc ? facts : createFacts(view);
  const found = [];
  RULES.forEach((rule, order) => {
    rule.check(TYPED.has(rule) ? typedFacts : facts, ({ target, canvas, message, data, severity = rule.severity }) => {
      const problem = { code: rule.code, severity, target };
      if (canvas !== undefined) problem.canvas = canvas;
      problem.message = message;
      if (data !== undefined) problem.data = data;
      found.push({ order, problem });
    });
  });
  return found
    .sort(
      (a, b) =>
        a.order - b.order ||
        compareText(a.problem.target, b.problem.target) ||
        compareText(a.problem.message, b.problem.message)
    )
    .map(({ problem }) => problem);
}
