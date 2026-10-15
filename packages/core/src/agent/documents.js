// What every host answers alike from the document alone (AI interface spec §4.2): reading and querying it, its
// Problems, its scenarios run again and its audit. The file host and the Editor's host both run these, so the same
// document gives the same answers in both.
import { auditOf, replayed, toAuditReport } from "../audit/report.js";
import { AgentError } from "./errors.js";
import { canvasOf, readOperations } from "./file/read.js";

/**
 * The operations a host runs on `{ doc }`, each `(session, args) → result`, throwing an `AgentError` to fail.
 * @type {Record<string, (session: { doc: object }, args: object) => object>}
 */
export const documentOperations = {
  ...readOperations,
  "scenario.replay": ({ doc }, { id }) => {
    const all = doc.annotations?.scenarios ?? {};
    if (id && !Object.hasOwn(all, id)) {
      throw new AgentError("NOT_FOUND", `There is no scenario "${id}"; document.summary counts them`, { id });
    }
    const chosen = id ? [[id, all[id]]] : Object.entries(all).sort(([a], [b]) => (a < b ? -1 : 1));
    return { scenarios: chosen.map(([key, scenario]) => replayed(doc, key, scenario)) };
  },
  "audit.report": ({ doc }, { canvas, format }) => {
    if (canvas) canvasOf(doc, canvas);
    if (format === "md") return { markdown: toAuditReport(doc, { canvas }) };
    return auditOf(doc, { canvas });
  }
};
