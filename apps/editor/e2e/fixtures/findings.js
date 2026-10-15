// Get paid (as built) with three findings about its processing box, to read beside their badge: an audit's, with its
// evidence in code and in a document, and a conformance run's, as `statewright conform --write` keeps them.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { applyBatch, parse, sign, stringify } from "statewright";

const GET_PAID = resolve(import.meta.dirname, "../../../../examples/get-paid-as-built.sttw");

/** The file to open (Open file…), signed as the CLI signs what it writes. */
export async function getPaidWithFindings() {
  const { doc } = parse(readFileSync(GET_PAID, "utf8"));
  const audit = {
    code: "H1",
    title: "advanceStatus trusts its callers",
    severity: "high",
    description: "Eight call sites move transactions without checking the table, so a retried payout can skip review.",
    targets: ["nod_processing"],
    source: "audit",
    evidence: [
      { kind: "code", path: "core.js", lines: "34-52", symbol: "advanceStatus" },
      { kind: "doc", url: "https://example.com/runbooks/payouts", title: "Payout runbook" }
    ]
  };
  const diverged = {
    code: "diverged",
    title: "A retried payout is still processing",
    severity: "critical",
    description: 'Scenario "Paid before the sweep", step 3: the design expects paid; the code is in processing.',
    targets: ["nod_processing"],
    source: "conformance",
    evidence: [{ kind: "code", path: "payouts/retry.js", lines: "112" }]
  };
  const minor = {
    code: "L4",
    title: "The status name differs from the API's",
    severity: "low",
    targets: ["nod_processing"],
    source: "audit"
  };
  const changed = applyBatch(doc, [
    { type: "finding.upsert", args: { id: "fnd_H1", finding: audit } },
    { type: "finding.upsert", args: { id: "fnd_diverged", finding: diverged } },
    { type: "finding.upsert", args: { id: "fnd_L4", finding: minor } }
  ]).doc;
  const signed = await sign(changed, { channel: "cli" }, { now: new Date("2026-10-14T12:00:00Z") });
  return {
    name: "get-paid-as-built.sttw",
    mimeType: "application/json",
    buffer: Buffer.from(stringify(signed))
  };
}
