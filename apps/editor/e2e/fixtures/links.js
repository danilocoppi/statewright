// Acme Billing, with links to follow: its invoicing service holds the invoice's lifecycle, whose issued state holds the
// issuing; on the issuing, a link to the paid state one level up, a link to the ledger's flow (another branch of the
// project) and a link to the event the payment sends. With `gone`, one more link whose target is no longer in the project,
// as a file edited by hand can leave it.
import { applyBatch, createDocument, sign, stringify } from "statewright";

const node = (canvas, id, value) => ({ type: "node.add", args: { canvas, id, node: value } });
const edge = (canvas, from, to) => ({ type: "edge.add", args: { canvas, edge: { from, to } } });
const inside = (owner, kind, name, id) => ({ type: "canvas.create", args: { kind, name, owner, id } });

/**
 * The file to open (Open file…), signed as the CLI signs what it writes; its levels are arranged as it opens.
 * @param {{ gone?: boolean }} [options]
 */
export async function acmeBillingWithLinks({ gone = false } = {}) {
  const doc = createDocument({ name: "Acme Billing" });
  const { doc: linked } = applyBatch(doc, [
    { type: "catalog.add", args: { collection: "events", id: "evt_invoicePaid", item: { name: "invoice.paid" } } },
    node("cnv_acmeBilling", "nod_invoicing", { kind: "service", name: "Invoicing" }),
    node("cnv_acmeBilling", "nod_ledger", { kind: "service", name: "Ledger" }),
    edge("cnv_acmeBilling", "nod_invoicing", "nod_ledger"),
    inside("nod_ledger", "flow", "Post to the ledger", "cnv_postToLedger"),
    node("cnv_postToLedger", "nod_postStart", { kind: "start" }),
    node("cnv_postToLedger", "nod_posted", { kind: "end", name: "Posted" }),
    edge("cnv_postToLedger", "nod_postStart", "nod_posted"),
    inside("nod_invoicing", "machine", "Invoice lifecycle", "cnv_invoiceLifecycle"),
    node("cnv_invoiceLifecycle", "nod_lifecycleStart", { kind: "initial" }),
    node("cnv_invoiceLifecycle", "nod_draft", { kind: "state", name: "Draft" }),
    node("cnv_invoiceLifecycle", "nod_issued", { kind: "state", name: "Issued" }),
    node("cnv_invoiceLifecycle", "nod_paid", { kind: "state", name: "Paid", outcome: "success", terminal: true }),
    edge("cnv_invoiceLifecycle", "nod_lifecycleStart", "nod_draft"),
    edge("cnv_invoiceLifecycle", "nod_draft", "nod_issued"),
    edge("cnv_invoiceLifecycle", "nod_issued", "nod_paid"),
    inside("nod_issued", "machine", "Issuing", "cnv_issuing"),
    node("cnv_issuing", "nod_issuingStart", { kind: "initial" }),
    node("cnv_issuing", "nod_sending", { kind: "state", name: "Sending" }),
    node("cnv_issuing", "nod_sent", { kind: "state", name: "Sent" }),
    node("cnv_issuing", "nod_toPaid", { kind: "ref", target: "nod_paid" }),
    node("cnv_issuing", "nod_toLedger", { kind: "ref", target: "cnv_postToLedger" }),
    node("cnv_issuing", "nod_toEvent", { kind: "ref", target: "evt_invoicePaid" }),
    edge("cnv_issuing", "nod_issuingStart", "nod_sending"),
    edge("cnv_issuing", "nod_sending", "nod_sent"),
    { type: "edge.add", args: { canvas: "cnv_issuing", edge: { from: "nod_sent", to: "nod_toPaid", kind: "link" } } }
  ]);
  const edited = structuredClone(linked);
  if (gone) edited.canvases.cnv_issuing.nodes.nod_toArchive = { kind: "ref", target: "nod_archived" };
  const signed = await sign(edited, { channel: "cli" }, { now: new Date("2026-10-14T12:00:00Z") });
  return { name: "acme-billing.sttw", mimeType: "application/json", buffer: Buffer.from(stringify(signed)) };
}
