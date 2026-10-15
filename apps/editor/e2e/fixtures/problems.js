// Payments with more Problems to read beside their markers: the compliance hold also to verify (low confidence), and
// two edges of its expiry clock — an incomplete one (the level shows only some of its transitions, and one of them
// says nothing of what triggers it) and an error (an edge that ends at the level's initial node, which no command would
// make: the file was edited by hand).
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { applyBatch, parse, sign, stringify } from "statewright";

const PAYMENTS = resolve(import.meta.dirname, "../../../../examples/payments.sttw");

/** The file to open (Open file…), signed as the CLI signs what it writes. */
export async function paymentsWithProblems() {
  const { doc } = parse(readFileSync(PAYMENTS, "utf8"));
  const changed = applyBatch(doc, [
    { type: "node.update", args: { id: "nod_complianceHold", set: { confidence: "low" } } },
    { type: "canvas.update", args: { id: "cnv_expiryClock", set: { transitions: "partial" } } },
    { type: "edge.update", args: { id: "edg_runningPaused", set: { on: [] } } }
  ]).doc;
  const edited = structuredClone(changed);
  edited.canvases.cnv_expiryClock.edges.edg_pausedStopped.to = "nod_expiryClockInitial";
  const signed = await sign(edited, { channel: "cli" }, { now: new Date("2026-10-14T12:00:00Z") });
  return { name: "payments.sttw", mimeType: "application/json", buffer: Buffer.from(stringify(signed)) };
}
