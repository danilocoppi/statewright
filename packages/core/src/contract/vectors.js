// A design's scenarios as test vectors (source-of-truth spec §5, Vectors): each scenario replayed through the engine
// (simulator spec §5), with what it starts from, what each step does, the states the design expects after it — by the
// names the code holds — and the transitions it fires. A scenario that no longer replays as recorded is stale, not a
// vector.
import { sorted } from "../rules/facts.js";
import { reachedOf, replay, start, step } from "../simulate/index.js";
import { defined, eventName, viaName } from "./names.js";

/** The interior a node opens: a level, or the level of the reusable part it is an instance of. */
function interiorOf(doc, node) {
  if (node?.inner?.canvas) return doc.canvases[node.inner.canvas];
  if (node?.inner?.definition) return doc.canvases[doc.definitions?.[node.inner.definition]?.canvas];
  return undefined;
}

/** A path of node IDs from a level (`nod_open/nod_created`) as names (`open/created`). */
export function namePath(doc, canvasId, path) {
  let canvas = doc.canvases[canvasId];
  return path
    .split("/")
    .map(id => {
      const node = canvas?.nodes[id];
      canvas = interiorOf(doc, node);
      return node?.name ?? id;
    })
    .join("/");
}

/** What a run reached, by name. */
const expectOf = (doc, canvasId, reached) =>
  defined({ active: reached.active.map(path => namePath(doc, canvasId, path)), ended: reached.ended });

/** Answers a scenario gives, with where they are asked by name. */
const givenOf = (doc, canvasId, answers) =>
  answers?.length ?
    answers.map(answer => defined({ ...answer, at: answer.at ? namePath(doc, canvasId, answer.at) : undefined }))
  : undefined;

/** The transitions a run fired. */
const firedOf = trace => {
  const fired = trace.filter(entry => entry.type === "transition" && entry.edge).map(entry => entry.edge);
  return fired.length ? fired : undefined;
};

/** A step's input by name: an event, a call, or time passing until an instant. */
function doOf(doc, input, clock) {
  if (input.event) return defined({ event: eventName(doc, input.event), payload: input.payload });
  if (input.call) return defined({ call: viaName(doc, input.call), payload: input.payload });
  return { wait: input.wait, until: clock };
}

/**
 * The scenarios of a design as vectors, in ID order, and those that no longer replay (`stale`).
 * @param {any} doc A schema-valid document.
 * @returns {{ vectors: object[], stale: Array<{ id: string, name: string, level: string, step: number }> }}
 */
export function vectorsOf(doc) {
  const vectors = [];
  const stale = [];
  const scenarios = sorted(doc.annotations?.scenarios);
  for (const [id, scenario] of scenarios) {
    const level = scenario.canvas;
    const { first } = replay(doc, scenario);
    if (first !== null) {
      stale.push({ id, name: scenario.name, level, step: first });
      continue;
    }
    const begun = start(doc, { canvas: level, ...scenario.start });
    let session = begun.session;
    const steps = scenario.steps.map(recorded => {
      const result = step(doc, session, { do: recorded.do, answers: recorded.answers ?? [] });
      session = result.session;
      return defined({
        do: doOf(doc, recorded.do, session.clock),
        given: givenOf(doc, level, recorded.answers),
        expect: expectOf(doc, level, reachedOf(session)),
        fired: firedOf(result.trace)
      });
    });
    const { at, entry, context, input, answers } = scenario.start;
    vectors.push(
      defined({
        id,
        name: scenario.name,
        level,
        kind: doc.canvases[level]?.kind,
        start: defined({
          at,
          entry: entry ? (doc.canvases[level]?.nodes[entry]?.name ?? entry) : undefined,
          context,
          input,
          given: givenOf(doc, level, answers),
          expect: expectOf(doc, level, reachedOf(begun.session)),
          fired: firedOf(begun.trace)
        }),
        steps
      })
    );
  }
  return { vectors, stale };
}
