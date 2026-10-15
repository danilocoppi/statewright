import { check, parse, stringify } from "statewright";
import { describe, expect, it } from "vitest";

import { newProject, PROJECT_KINDS } from "@/files/new-project";

const names = { state: "First state", end: "Done" };

describe("newProject", () => {
  it.each(PROJECT_KINDS)("creates a valid project without errors whose root canvas is a %s", kind => {
    const doc = newProject({ name: "Checkout", kind, names }, new Set());
    expect(parse(stringify(doc)).ok).toBe(true);
    expect(doc.project).toEqual({ id: "prj_checkout", name: "Checkout" });
    expect(doc.canvases[doc.root]).toMatchObject({ kind, name: "Checkout" });
    expect(check(doc).filter(problem => problem.severity === "error")).toEqual([]);
  });

  it("starts machines with an initial node leading to a first state, and flows with a start leading to an end", () => {
    const machine = newProject({ name: "A", kind: "machine", names }, new Set()).canvases.cnv_a;
    expect(Object.values(machine.nodes)).toEqual([{ kind: "initial" }, { kind: "state", name: "First state" }]);
    expect(Object.values(machine.edges)).toEqual([{ from: "nod_initial", to: "nod_firstState" }]);
    const flow = newProject({ name: "A", kind: "flow", names }, new Set()).canvases.cnv_a;
    expect(Object.values(flow.nodes)).toEqual([{ kind: "start" }, { kind: "end", name: "Done", outcome: "success" }]);
    expect(newProject({ name: "A", kind: "system", names }, new Set()).canvases.cnv_a.nodes).toEqual({});
  });

  it("never reuses the ID of a project already in this browser", () => {
    const doc = newProject({ name: "Checkout", kind: "flow", names }, new Set(["prj_checkout"]));
    expect(doc.project.id).toBe("prj_checkout2");
  });
});
