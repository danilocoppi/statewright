import { describe, expect, it } from "vitest";
import { check, listRules } from "../../src/index.js";
import { paymentsDoc, readExample } from "../helpers.js";
import { cleanDoc, problems, targets } from "./fixtures.js";

/** cleanDoc with a guest of every kind: a participant and the work's steps on the machine, a state guest on the flow. */
function withGuests() {
  const doc = cleanDoc();
  doc.catalog.parties.pty_boss = { kind: "human", name: "Boss" };
  doc.catalog.events.evt_go.source = "pty_boss";
  Object.assign(doc.canvases.cnv_m.nodes, {
    nod_boss: { kind: "participant", party: "pty_boss" },
    nod_work: { kind: "steps", action: "act_work" }
  });
  Object.assign(doc.canvases.cnv_f.nodes, {
    nod_bossHere: { kind: "participant", party: "pty_boss" },
    nod_doneHere: { kind: "state", target: "nod_done" }
  });
  return doc;
}

const codes = doc => check(doc).map(problem => problem.code);

describe("the guests' rules (mixed levels spec §8)", () => {
  it("lets guests be: no machine, flow or reference rule fires on a clean document with guests", () => {
    expect(codes(cleanDoc())).toEqual([]);
    expect(codes(withGuests())).toEqual([]);
  });

  it("roles.stepsWithoutFlow: embedded steps of an action that has no flow yet", () => {
    const doc = withGuests();
    doc.catalog.actions.act_plain = { name: "Plain" };
    doc.canvases.cnv_m.nodes.nod_plain = { kind: "steps", action: "act_plain" };
    const [problem] = problems(doc, "roles.stepsWithoutFlow");
    expect(problem).toMatchObject({ severity: "incomplete", target: "nod_plain", canvas: "cnv_m" });
    expect(problem.message).toBe('The steps of action "Plain" have no flow yet; add a flow inside it');
  });

  it("roles.stateGuest: a state guest stands for a state of a machine level", () => {
    const doc = withGuests();
    doc.canvases.cnv_f.nodes.nod_doneHere.target = "nod_init";
    doc.canvases.cnv_f.nodes.nod_startHere = { kind: "state", target: "nod_start" };
    expect(problems(doc, "roles.stateGuest").map(problem => [problem.target, problem.severity])).toEqual([
      ["nod_doneHere", "error"],
      ["nod_startHere", "error"]
    ]);
    expect(problems(doc, "roles.stateGuest")[0].message).toBe(
      "This state guest stands for initial node nod_init, which is not a state of a state machine"
    );
  });

  it("roles.waitInAction: embedded steps whose flow waits run apart from the machine's step", () => {
    const doc = withGuests();
    doc.canvases.cnv_f.nodes.nod_hold = { kind: "wait", on: ["evt_go"] };
    doc.canvases.cnv_f.edges.edg_tellHold = { from: "nod_tell", to: "nod_hold" };
    doc.canvases.cnv_f.edges.edg_holdEnd = { from: "nod_hold", to: "nod_end" };
    expect(
      problems(doc, "roles.waitInAction").map(problem => [problem.target, problem.severity, problem.data])
    ).toEqual([["nod_work", "warning", { waits: ["nod_hold"] }]]);
    // Without embedded steps, an action's waiting flow is a procedure of its own, as before format 1.2.
    delete doc.canvases.cnv_m.nodes.nod_work;
    expect(targets(doc, "roles.waitInAction")).toEqual([]);
  });

  it("roles.participantTwice: one participant per party on a level", () => {
    const doc = withGuests();
    doc.canvases.cnv_m.nodes.nod_bossAgain = { kind: "participant", party: "pty_boss" };
    expect(problems(doc, "roles.participantTwice").map(problem => [problem.target, problem.data])).toEqual([
      ["nod_bossAgain", { nodes: ["nod_boss", "nod_bossAgain"] }]
    ]);
  });

  it("leaves a missing party to the reference rules", () => {
    const doc = withGuests();
    doc.canvases.cnv_m.nodes.nod_boss.party = "pty_gone";
    expect(targets(doc, "ref.dangling")).toEqual(["nod_boss"]);
  });

  it("is quiet on the examples, and listed", () => {
    for (const name of ["payments", "bookings", "get-paid-as-built", "payout-batch"]) {
      const doc = name === "payments" ? paymentsDoc() : JSON.parse(readExample(`${name}.sttw`));
      expect(codes(doc).filter(code => code.startsWith("roles."))).toEqual([]);
    }
    const listed = listRules().map(rule => rule.code);
    for (const code of ["roles.stepsWithoutFlow", "roles.stateGuest", "roles.waitInAction", "roles.participantTwice"]) {
      expect(listed).toContain(code);
    }
  });
});
