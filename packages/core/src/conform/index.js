// statewright/conform (source-of-truth spec §6): whether a system's code does what its design says — the results its
// tests write after running the contract's vectors, compared with the design, the divergences as findings; and the
// helper that runs the vectors through a JavaScript system's code.
export { conformOf } from "./compare.js";
export { toConformReport } from "./report.js";
export { RESULTS_VERSION, checkResults, contractDigest, parseResults } from "./results.js";
export { runVector, runVectors, writeResults } from "./run.js";
