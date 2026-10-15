// What the code's results say against the design (source-of-truth spec §6): each vector's steps compared with what the
// design expects, the divergences as findings on the transitions they break, and the transitions no passing step
// proves.
import { toContract } from "../contract/index.js";
import { checkResults, contractDigest } from "./results.js";
import { sameStates, statesOf, whereOf } from "./states.js";

/** The interior a node opens: a level, or the level of the reusable part it is an instance of. */
function interiorOf(doc, node) {
  if (node?.inner?.canvas) return node.inner.canvas;
  if (node?.inner?.definition) return doc.definitions?.[node.inner.definition]?.canvas;
  return undefined;
}

/** The node a name path leads to from a level (`open/created`), or undefined. */
function nodeOfPath(doc, canvasId, path) {
  let canvas = canvasId;
  let found;
  for (const name of path.split("/")) {
    const entry = Object.entries(doc.canvases[canvas]?.nodes ?? {}).find(([, node]) => node.name === name);
    if (!entry) return undefined;
    found = entry[0];
    canvas = interiorOf(doc, entry[1]);
  }
  return found;
}

/** What a step's finding points at: the transitions the design fires there, else the states it expects, else the scenario. */
function targetsOf(doc, vector, index) {
  const fired = index === 0 ? vector.start.fired : vector.steps[index - 1].fired;
  if (fired?.length) return [...fired];
  const expected = index === 0 ? vector.start.expect : vector.steps[index - 1].expect;
  const states = expected.active.map(path => nodeOfPath(doc, vector.level, path)).filter(Boolean);
  return states.length ? states : [vector.id];
}

/** The transitions a vector fires at its start and at each step. */
const firedAt = (vector, index) => (index === 0 ? vector.start.fired : vector.steps[index - 1].fired) ?? [];

/**
 * One vector against its result: passed, diverged at a step, threw at a step, stopped early, or not run.
 * @returns {{ outcome: string, step?: number, finding?: object, proved: string[] }}
 */
function compareVector(doc, vector, result) {
  const scenario = `Scenario "${vector.name}"`;
  if (!result || "skipped" in result) {
    const why = result ? `: ${result.skipped}` : "; the results have no entry for it";
    return {
      outcome: "notRun",
      proved: [],
      finding: { code: "notRun", severity: "info", title: `${scenario} was not run${why}`, targets: [vector.id] }
    };
  }
  const expected = [vector.start.expect, ...vector.steps.map(step => step.expect)];
  const proved = [];
  for (const [index, expect] of expected.entries()) {
    const got = result.steps[index];
    const where = whereOf(vector, index);
    if (got === undefined) {
      return {
        outcome: "incomplete",
        step: index,
        proved,
        finding: {
          code: "incomplete",
          severity: "info",
          title: `${scenario} stopped before ${index === 0 ? "its start" : `step ${index}`}: the results have ${result.steps.length} of its ${expected.length} states`,
          targets: [vector.id]
        }
      };
    }
    if ("error" in got) {
      return {
        outcome: "threw",
        step: index,
        proved,
        finding: {
          code: "threw",
          severity: "medium",
          title: `${where}: the code threw "${got.error}"; the design expects ${statesOf(expect.active)}`,
          targets: targetsOf(doc, vector, index)
        }
      };
    }
    if (!sameStates(got.active, expect.active)) {
      return {
        outcome: "diverged",
        step: index,
        proved,
        finding: {
          code: "diverged",
          severity: "high",
          title: `${where}: the design expects ${statesOf(expect.active)}; the code is in ${statesOf(got.active)}`,
          targets: targetsOf(doc, vector, index)
        }
      };
    }
    proved.push(...firedAt(vector, index));
  }
  return { outcome: "passed", proved };
}

/** Each machine's transitions, with those no passing step proves. */
function coverageOf(contract, proved) {
  return contract.machines.map(machine => {
    const missed = machine.transitions.filter(transition => !proved.has(transition.id));
    return {
      machine: machine.id,
      name: machine.name,
      transitions: machine.transitions.length,
      proved: machine.transitions.length - missed.length,
      missed: missed.map(({ id, from, to }) => ({ id, from, to }))
    };
  });
}

/**
 * Compare the results a system's tests wrote with the design's vectors (source-of-truth spec §6).
 * @param {any} doc A schema-valid document.
 * @param {object} results A results object (`checkResults` says why one is not); refused with an Error otherwise.
 * @returns {Promise<{ ok: boolean, same: boolean, design: { project: string, name: string, content: string },
 *   results: { contract: string, runner?: string }, summary: { vectors: number, passed: number, diverged: number,
 *   threw: number, incomplete: number, notRun: number, unknown: number }, vectors: Array<{ id: string, name: string,
 *   outcome: string, step?: number }>, findings: object[], coverage: object[] }>} `same`: the results are for this
 *   version of the design; `ok`: they are, and nothing diverged or threw. `findings` are ready for `findings.replace`.
 */
export async function conformOf(doc, results) {
  const checked = checkResults(results);
  if (!checked.ok) throw new Error(`The results file ${checked.message}`);
  const { contract } = await toContract(doc);
  const design = {
    project: contract.source.project,
    name: contract.source.name,
    content: contract.source.content,
    contract: await contractDigest(contract)
  };
  const read = { contract: results.contract, ...(results.runner ? { runner: results.runner } : {}) };
  const summary = {
    vectors: contract.vectors.length,
    passed: 0,
    diverged: 0,
    threw: 0,
    incomplete: 0,
    notRun: 0,
    unknown: 0
  };
  if (results.contract !== design.contract) {
    const finding = {
      code: "otherVersion",
      severity: "medium",
      title:
        `The results are for another version of the design or of its scenarios (${results.contract.slice(0, 12)}), ` +
        `not this one (${design.contract.slice(0, 12)}): run the vectors of its contract again`,
      targets: [doc.root]
    };
    return {
      ok: false,
      same: false,
      design,
      results: read,
      summary,
      vectors: [],
      findings: [finding],
      coverage: coverageOf(contract, new Set())
    };
  }
  const byId = new Map(results.vectors.map(vector => [vector.id, vector]));
  const proved = new Set();
  const findings = [];
  const vectors = contract.vectors.map(vector => {
    const compared = compareVector(doc, vector, byId.get(vector.id));
    summary[compared.outcome] += 1;
    for (const id of compared.proved) proved.add(id);
    if (compared.finding) findings.push(compared.finding);
    return {
      id: vector.id,
      name: vector.name,
      outcome: compared.outcome,
      ...(compared.step === undefined ? {} : { step: compared.step })
    };
  });
  const known = new Set(contract.vectors.map(vector => vector.id));
  for (const result of results.vectors.filter(vector => !known.has(vector.id))) {
    summary.unknown += 1;
    const scenario = doc.annotations?.scenarios?.[result.id];
    findings.push({
      code: "unknownVector",
      severity: "info",
      title:
        scenario ?
          `Scenario "${scenario.name}" is not among the contract's vectors (it no longer replays as recorded): its result is not compared`
        : `The results name ${result.id}, which is not among the design's vectors`,
      targets: [scenario ? result.id : doc.root]
    });
  }
  // Results where no vector ran prove nothing — a misspelt `only`, a driver that skips everything — and must not pass.
  const ran = summary.passed + summary.diverged + summary.threw + summary.incomplete;
  if (contract.vectors.length && !ran) {
    findings.push({
      code: "nothingRun",
      severity: "medium",
      title: "No vector of the design ran: the results prove nothing about the code",
      targets: [doc.root]
    });
  }
  return {
    ok: summary.diverged === 0 && summary.threw === 0 && (ran > 0 || !contract.vectors.length),
    same: true,
    design,
    results: read,
    summary,
    vectors,
    findings,
    coverage: coverageOf(contract, proved)
  };
}
