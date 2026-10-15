import { FORMAT_VERSION } from "./constants.js";

/**
 * Ordered migrations between consecutive format versions: `{ from, to, up(doc) → doc }` (`up` gets a copy; `migrate`
 * writes the new version).
 * @type {Array<{ from: string, to: string, up: (doc: any) => any }>}
 */
export const MIGRATIONS = [
  // 1.1 adds saved scenarios (annotations.scenarios); a 1.0 document is a valid 1.1 document as it is.
  { from: "1.0", to: "1.1", up: doc => doc },
  // 1.2 adds guests (mixed levels spec §5): new node kinds and optional fields only.
  { from: "1.1", to: "1.2", up: doc => doc },
  // 1.3 adds comments and locks (collaboration spec §8): optional annotations only.
  { from: "1.2", to: "1.3", up: doc => doc }
];

const VERSION_PATTERN = /^\d+\.\d+$/;

/** Negative when a < b, zero when equal, positive when a > b ("MAJOR.MINOR"). */
export function compareVersions(a, b) {
  const [aMajor, aMinor] = a.split(".").map(Number);
  const [bMajor, bMinor] = b.split(".").map(Number);
  return aMajor - bMajor || aMinor - bMinor;
}

/**
 * Bring a raw (not yet validated) document up to `target`, one step at a time.
 * Never throws; refuses documents newer than `target`.
 * @param {any} raw
 * @param {{ migrations?: typeof MIGRATIONS, target?: string }} [options]
 * @returns {{ ok: true, doc: any, log: string[] } | { ok: false, errors: Array<{ path: string, message: string }> }}
 */
export function migrate(raw, { migrations = MIGRATIONS, target = FORMAT_VERSION } = {}) {
  const version = raw?.statewright;
  if (typeof version !== "string" || !VERSION_PATTERN.test(version)) {
    return {
      ok: false,
      errors: [{ path: "/statewright", message: 'Missing or invalid format version (expected "MAJOR.MINOR")' }]
    };
  }
  if (compareVersions(version, target) > 0) {
    return {
      ok: false,
      errors: [
        {
          path: "/statewright",
          message: `This document uses Statewright format ${version}; upgrade Statewright to open it.`
        }
      ]
    };
  }
  let doc = raw;
  let current = version;
  const log = [];
  while (compareVersions(current, target) < 0) {
    const step = migrations.find(migration => migration.from === current);
    if (!step) {
      return {
        ok: false,
        errors: [{ path: "/statewright", message: `No migration from format ${current} to ${target}` }]
      };
    }
    doc = step.up(structuredClone(doc));
    doc.statewright = step.to;
    log.push(`${step.from} → ${step.to}`);
    current = step.to;
  }
  return { ok: true, doc, log };
}
