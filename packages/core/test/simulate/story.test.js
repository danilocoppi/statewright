import { describe, expect, it } from "vitest";
import { frameOf, start, step, storyOf } from "../../src/simulate/index.js";
import { paymentsDoc, readExample } from "../helpers.js";
import { AT, docOf, events, machine } from "./helpers.js";

/** A document with a machine: idle, then busy — a state with a machine inside, which starts at its first step. */
function job() {
  return docOf(
    {
      cnv_job: machine(
        "Job",
        {
          nod_start: { kind: "initial" },
          nod_idle: { kind: "state", name: "idle" },
          nod_busy: { kind: "state", name: "busy", inner: { canvas: "cnv_busy" } }
        },
        {
          edg_begin: { from: "nod_start", to: "nod_idle" },
          edg_go: { from: "nod_idle", to: "nod_busy", on: ["evt_go"] },
          edg_rest: { from: "nod_busy", to: "nod_idle", on: ["evt_rest"] }
        }
      ),
      cnv_busy: machine(
        "Busy",
        {
          nod_in: { kind: "initial" },
          nod_first: { kind: "state", name: "first" },
          nod_second: { kind: "state", name: "second" }
        },
        {
          edg_into: { from: "nod_in", to: "nod_first" },
          edg_next: { from: "nod_first", to: "nod_second", on: ["evt_next"] }
        }
      )
    },
    { events: events("go", "rest", "next", "noise") }
  );
}

/** A scenario of the job: started at AT, then these inputs (an event ID stands for that event). */
const jobScenario = (...inputs) => ({
  name: "A job",
  canvas: "cnv_job",
  start: { at: AT },
  steps: inputs.map(input => ({ do: typeof input === "string" ? { event: input } : input, reached: { active: [] } }))
});

describe("the story of a scenario, as the stage and the scenario page tell it (simulator spec §7)", () => {
  it("tells the start on the scenario's level, then each step on the level of its transition, with its caption", () => {
    const doc = paymentsDoc();
    const story = storyOf(doc, doc.annotations.scenarios.scn_verificationPausesTheClock);
    expect(story.canvas).toBe("cnv_lifecycle");
    expect(story.stopped).toBeNull();
    expect(story.frames.map(frame => [frame.step, frame.level, frame.clock])).toEqual([
      [0, "cnv_lifecycle", "2026-01-05T09:00:00Z"],
      [1, "cnv_expiryClock", "2026-01-05T09:00:00Z"],
      // Two days pass: the quote's refresh timer falls due in the cross-border send.
      [2, "cnv_crossBorderSend", "2026-01-07T09:00:00Z"],
      [3, "cnv_expiryClock", "2026-01-07T09:00:00Z"]
    ]);
    const [begun, paused] = story.frames;
    expect(begun).toMatchObject({ do: null, answers: [] });
    expect(begun.caption).toBeUndefined();
    expect(begun.active).toEqual([
      "nod_complianceHold/nod_clear",
      "nod_expiryClock/nod_running",
      "nod_sendCrossBorder/nod_awaitingFunds"
    ]);
    expect(begun.taken.every(taken => taken.initial)).toBe(true);
    expect(paused).toMatchObject({
      do: { event: "evt_verifyStarted" },
      caption: "The payer starts identity verification. The clock stops.",
      taken: [
        {
          edge: "edg_runningPaused",
          canvas: "cnv_expiryClock",
          from: "nod_expiryClock/nod_running",
          to: "nod_expiryClock/nod_paused",
          initial: false
        }
      ]
    });
    expect(paused.active).toContain("nod_expiryClock/nod_paused");
  });

  it("keeps the answers a step was taken with", () => {
    const doc = paymentsDoc();
    const story = storyOf(doc, doc.annotations.scenarios.scn_paysInTime);
    expect(story.frames).toHaveLength(5);
    expect(story.frames[3].answers).toEqual(doc.annotations.scenarios.scn_paysInTime.steps[2].answers);
    expect(story.frames[4].active).toContain("nod_sendCrossBorder/nod_completed");
  });

  it("shows a step where its input's transition is drawn, not inside the state it entered", () => {
    const story = storyOf(job(), jobScenario("evt_go", "evt_next"));
    const [, going, next] = story.frames;
    expect(going.taken.map(taken => [taken.edge, taken.canvas, taken.initial])).toEqual([
      ["edg_go", "cnv_job", false],
      ["edg_into", "cnv_busy", true]
    ]);
    expect(going.level).toBe("cnv_job");
    expect(going.active).toEqual(["nod_busy/nod_first"]);
    expect(next.level).toBe("cnv_busy");
  });

  it("keeps the level shown when a step takes no transition", () => {
    const story = storyOf(job(), jobScenario("evt_go", "evt_next", "evt_noise", { wait: "PT1H" }));
    expect(story.frames.map(frame => [frame.taken.length, frame.level])).toEqual([
      [1, "cnv_job"],
      [2, "cnv_job"],
      [1, "cnv_busy"],
      [0, "cnv_busy"],
      [0, "cnv_busy"]
    ]);
    expect(story.frames[4].clock).toBe("2026-01-05T10:00:00Z");
  });

  it("tells a flow by its tokens, each edge once, the forks' edges too", () => {
    const doc = JSON.parse(readExample("payout-batch.sttw"));
    const story = storyOf(doc, doc.annotations.scenarios.scn_aPayoutIsRefused);
    const [begun, confirmed] = story.frames;
    expect(begun.level).toBe("cnv_payOutBatch");
    expect(begun.active).toEqual(["nod_confirm"]);
    const edges = begun.taken.map(taken => taken.edge);
    expect(edges.filter(edge => edge === "edg_oneStartRail")).toHaveLength(1);
    expect(edges).toEqual(expect.arrayContaining(["edg_closeAnnounce", "edg_closeBook", "edg_bothConfirm"]));
    expect(begun.taken.find(taken => taken.edge === "edg_startTotal").initial).toBe(true);
    expect(confirmed).toMatchObject({ level: "cnv_payOutBatch", active: [], ended: "failure" });
  });

  it("stops at a step the design no longer takes, and says why", () => {
    const doc = paymentsDoc();
    const scenario = structuredClone(doc.annotations.scenarios.scn_paysInTime);
    delete scenario.steps[2].answers;
    const story = storyOf(doc, scenario);
    expect(story.frames).toHaveLength(3);
    expect(story.stopped).toMatchObject({ step: 3, question: { kind: "transition" } });

    scenario.steps[0].do = { event: "evt_nope" };
    expect(storyOf(doc, scenario)).toMatchObject({
      frames: [{ step: 0 }],
      stopped: { step: 1, code: "dangling", message: "There is no event evt_nope" }
    });
  });

  it("takes a step again as a run would: answers nothing asks for left out, answers that no longer fit asked again", () => {
    const doc = paymentsDoc();
    const scenario = structuredClone(doc.annotations.scenarios.scn_paysInTime);
    scenario.steps[0].answers = scenario.steps[3].answers;
    const told = storyOf(doc, scenario);
    expect(told.stopped).toBeNull();
    expect(told.frames).toHaveLength(5);
    expect(told.frames[1].answers).toEqual([]);

    const changed = structuredClone(doc.annotations.scenarios.scn_paysInTime);
    changed.steps[2].answers[0].value = "edg_nope";
    expect(storyOf(doc, changed)).toMatchObject({ stopped: { step: 3, question: { kind: "transition" } } });
  });

  it("stops at its start when the design can no longer start it", () => {
    const doc = paymentsDoc();
    const scenario = { ...doc.annotations.scenarios.scn_paysInTime, canvas: "cnv_expiryClock" };
    expect(storyOf(doc, scenario)).toMatchObject({ frames: [], stopped: { step: 0, code: "notExecutable" } });
  });
});

describe("a frame of a run, as the stage shows it", () => {
  it("lists the edges a step took in order, each on its level, the initial ones marked", () => {
    const doc = job();
    const begun = start(doc, { canvas: "cnv_job", at: AT });
    const going = step(doc, begun.session, { do: { event: "evt_go" } });
    const frame = frameOf(doc, "cnv_job", { step: 1, do: { event: "evt_go" }, ...going }, "cnv_job");
    expect(frame.taken).toEqual([
      { edge: "edg_go", canvas: "cnv_job", from: "nod_idle", to: "nod_busy", initial: false },
      { edge: "edg_into", canvas: "cnv_busy", from: "nod_busy/nod_in", to: "nod_busy/nod_first", initial: true }
    ]);
    expect(frame).toMatchObject({ level: "cnv_job", trail: ["cnv_job"], active: ["nod_busy/nod_first"] });
    expect(frame.trace).toBe(going.trace);
  });

  it("names the levels from the top one down to the level shown", () => {
    const doc = paymentsDoc();
    const story = storyOf(doc, doc.annotations.scenarios.scn_verificationPausesTheClock);
    expect(story.frames.map(frame => frame.trail)).toEqual([
      ["cnv_lifecycle"],
      ["cnv_lifecycle", "cnv_expiryClock"],
      ["cnv_lifecycle", "cnv_crossBorderSend"],
      ["cnv_lifecycle", "cnv_expiryClock"]
    ]);
  });
});
