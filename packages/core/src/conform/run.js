// Running a contract's vectors against a system's own code (source-of-truth spec §6): a driver, written once per
// machine, starts a record, applies each step and reads its states; each vector's states are kept for the results
// file, and the first one that differs from the design fails it.
import { RESULTS_VERSION, checkResults, contractDigest } from "./results.js";
import { sameStates, statesOf, whereOf } from "./states.js";

/**
 * @typedef {object} Driver What connects a machine's vectors to the code (source-of-truth spec §6). Each function may
 *   return a promise.
 * @property {(vector: object) => any} start Starts what the vector starts (`vector.start`: `at`, `entry`, `context`,
 *   `input`) through the system's own code, and returns a handle on the record.
 * @property {(handle: any, step: object) => any} apply Performs one step's `do`: an `event` or a `call` by name, with
 *   its `payload`, or `wait` — moves the system's clock to `until`.
 * @property {(handle: any) => string | string[]} state Reads the active states, by name.
 * @property {(vector: object) => string | undefined} [skip] A reason not to run a vector, or nothing.
 */

/**
 * Run one vector through a driver: its start, then each step, until one differs from the design or throws.
 * @param {object} vector A vector of a contract.
 * @param {Driver} driver
 * @returns {Promise<{ id: string, steps: Array<{ active: string[] } | { error: string }>, failure?: string }>}
 *   `steps[0]` is the start and `steps[n]` the states after step n; `failure` says where and how it differs.
 */
export async function runVector(vector, driver) {
  const expected = [vector.start.expect, ...vector.steps.map(step => step.expect)];
  const steps = [];
  let handle;
  for (const [index, expect] of expected.entries()) {
    let active;
    try {
      if (index === 0) handle = await driver.start(vector);
      else await driver.apply(handle, vector.steps[index - 1].do);
      const state = await driver.state(handle);
      active = Array.isArray(state) ? [...state] : [state];
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      steps.push({ error: message });
      return { id: vector.id, steps, failure: `${whereOf(vector, index)}: the code threw "${message}"` };
    }
    steps.push({ active });
    if (!sameStates(active, expect.active)) {
      return {
        id: vector.id,
        steps,
        failure: `${whereOf(vector, index)}: the design expects ${statesOf(expect.active)}; the code is in ${statesOf(active)}`
      };
    }
  }
  return { id: vector.id, steps };
}

/**
 * Run a contract's vectors, one after another, as a results object: through one driver, or through one driver per
 * machine, keyed by level ID or subject.
 * @param {object} contract
 * @param {Driver | Record<string, Driver>} drivers
 * @param {{ only?: string | string[], runner?: string }} [options] `only`: the levels this run covers, by ID or by
 *   subject (the others are skipped, saying why); `runner`: the name of the tests' framework. A name in `only`, or a
 *   key of `drivers`, that is no level of the contract is refused: a run that skips everything proves nothing.
 * @returns {Promise<object>} A results object (source-of-truth spec §6, Results).
 */
export async function runVectors(contract, drivers, { only, runner } = {}) {
  const subjects = new Map(contract.machines.map(machine => [machine.id, machine.subject]));
  const known = new Set([...contract.machines, ...contract.flows].map(level => level.id));
  for (const subject of subjects.values()) if (subject) known.add(subject);
  const single = typeof drivers?.start === "function";
  const levels = only === undefined ? null : [only].flat();
  for (const name of [...(levels ?? []), ...(single ? [] : Object.keys(drivers))]) {
    if (!known.has(name)) throw new Error(`${name} is no level ID or subject of the contract`);
  }
  const keyOf = vector => [vector.level, subjects.get(vector.level)].find(key => key && Object.hasOwn(drivers, key));
  const vectors = [];
  for (const vector of contract.vectors) {
    const driver = single ? drivers : drivers[keyOf(vector)];
    const reason =
      levels && !levels.includes(vector.level) && !levels.includes(subjects.get(vector.level)) ?
        `not in this run (only ${levels.join(", ")})`
      : !driver ? `no driver for its level (${vector.level})`
      : await driver.skip?.(vector);
    if (reason) {
      vectors.push({ id: vector.id, skipped: reason });
      continue;
    }
    const { id, steps } = await runVector(vector, driver);
    vectors.push({ id, steps });
  }
  return {
    results: RESULTS_VERSION,
    contract: await contractDigest(contract),
    ...(runner ? { runner } : {}),
    vectors
  };
}

/**
 * Write a results file (Node): two-space indent and a final newline.
 * @param {string} path
 * @param {object} results
 */
export async function writeResults(path, results) {
  const checked = checkResults(results);
  if (!checked.ok) throw new Error(`Cannot write ${path}: the value given ${checked.message}`);
  const { writeFile } = await import("node:fs/promises");
  await writeFile(path, `${JSON.stringify(results, null, 2)}\n`);
}
