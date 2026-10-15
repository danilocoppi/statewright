import { applyBatch } from "statewright";
import { describe, expect, it } from "vitest";

import { projectLevel } from "@/canvas/project";

import { placedExample } from "../fixtures.js";

/** Payments' Runtime with one of each annotation. */
async function annotated() {
  const doc = await placedExample("payments");
  return applyBatch(doc, [
    { type: "note.add", args: { id: "nte_check", note: { canvas: "cnv_runtime", text: "Check the limits" } } },
    { type: "layout.note.set", args: { canvas: "cnv_runtime", id: "nte_check", x: 0, y: 600 } },
    { type: "focus.set", args: { ids: ["nod_scheduler"] } },
    {
      type: "lane.add",
      args: { id: "lne_back", lane: { canvas: "cnv_runtime", label: "Back office", nodes: ["nod_scheduler"] } }
    },
    {
      type: "finding.upsert",
      args: { id: "fnd_slow", finding: { code: "SLOW", title: "Slow", severity: "low", targets: ["nod_scheduler"] } }
    }
  ]).doc;
}

describe("annotation layers", () => {
  it("draws notes, focus, lanes and findings, and leaves out those the View menu hides", async () => {
    const doc = await annotated();
    const shown = projectLevel(doc, "cnv_runtime");
    const scheduler = level => level.nodes.find(node => node.id === "nod_scheduler").data.part.svg;
    expect(shown.nodes.some(node => node.id === "nte_check")).toBe(true);
    expect(shown.nodes.some(node => node.type === "lane")).toBe(true);
    expect(scheduler(shown)).toContain("SLOW");

    const hidden = projectLevel(doc, "cnv_runtime", { hidden: ["notes", "lanes", "findings", "focus"] });
    expect(hidden.nodes.some(node => node.id === "nte_check")).toBe(false);
    expect(hidden.nodes.some(node => node.type === "lane")).toBe(false);
    expect(scheduler(hidden)).not.toContain("SLOW");
    expect(scheduler(hidden)).not.toBe(
      scheduler(projectLevel(doc, "cnv_runtime", { hidden: ["notes", "lanes", "findings"] }))
    );
    // The document itself keeps them.
    expect(doc.annotations.notes.nte_check.text).toBe("Check the limits");
  });

  it("draws a transition's findings on its label, and leaves them out when the View menu hides findings", async () => {
    const doc = applyBatch(await placedExample("bookings"), [
      {
        type: "findings.replace",
        args: {
          source: "conformance",
          findings: [{ code: "diverged", title: "Not seated", severity: "high", targets: ["edg_confirmedSeated"] }]
        }
      }
    ]).doc;
    const seated = level => level.edges.find(edge => edge.id === "edg_confirmedSeated").data.label.svg;
    expect(seated(projectLevel(doc, "cnv_booking"))).toContain(">diverged</text>");
    expect(seated(projectLevel(doc, "cnv_booking", { hidden: ["findings"] }))).not.toContain("diverged");
  });
});
