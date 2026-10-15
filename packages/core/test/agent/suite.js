// The contract suite (AI interface spec §10): the same calls, with the same results, on every host of the agent
// contract — the file host here, the Editor's `window.statewright` in the Editor's own tests.
import { describe, expect, it } from "vitest";
import { checkResult, errorsOf } from "../../src/agent/contract.js";

/**
 * Describe the contract's behaviour on a host.
 * @param {string} title
 * @param {() => Promise<{ call: (name: string, args?: object) => Promise<object>, document: () => Promise<object> }>}
 *   openHost A host on a fresh copy of the payments example: `call` runs an operation on it, `document` reads the
 *   document as the host holds it.
 */
export function describeContract(title, openHost) {
  /** The host, its every answer checked: a result its operation's schema accepts, or an error the contract lists. */
  const open = async () => {
    const host = await openHost();
    const call = async (name, args) => {
      const answer = await host.call(name, args);
      if (answer.ok) expect(checkResult(name, answer.result), name).toEqual({ ok: true });
      else expect(errorsOf(name), `${name} answered ${answer.error.code}`).toContain(answer.error.code);
      return answer;
    };
    return { ...host, call };
  };

  describe(`${title}: the agent contract`, () => {
    it("summarises the document: its project, levels and counts", async () => {
      const { call } = await open();
      const { result } = await call("document.summary");
      expect(result.project).toMatchObject({ id: "prj_payments", name: "Payments" });
      expect(result.levels.map(level => [level.id, level.depth])).toEqual([
        ["cnv_runtime", 0],
        ["cnv_lifecycle", 1],
        ["cnv_complianceHold", 2],
        ["cnv_expiryClock", 2],
        ["cnv_crossBorderSend", 2]
      ]);
      expect(result.counts).toMatchObject({ canvases: 5, nodes: 35, edges: 39, events: 18, scenarios: 2 });
    });

    it("reads a level, finds elements by name, and says where one is used and how to reach it", async () => {
      const { call } = await open();
      const level = (await call("level.get", { canvas: "cnv_expiryClock" })).result;
      expect(level).toMatchObject({ canvas: "cnv_expiryClock", name: "Expiry clock", kind: "machine" });
      expect(level.nodes.find(node => node.id === "nod_paused")).toMatchObject({ kind: "state", name: "paused" });
      expect((await call("query.find", { text: "PAUSED" })).result.found).toEqual([
        {
          id: "nod_paused",
          kind: "state",
          name: "paused",
          canvas: "cnv_expiryClock",
          path: "Runtime › Lifecycle engine › Expiry clock"
        }
      ]);
      expect((await call("query.find", { text: "verify", kind: "event" })).result.found.map(item => item.id)).toEqual([
        "evt_verifyEnded",
        "evt_verifyStarted"
      ]);
      expect((await call("query.usages", { id: "evt_verifyStarted" })).result.usages.length).toBeGreaterThan(0);
      expect((await call("query.path", { id: "cnv_expiryClock" })).result.path.map(step => step.canvas)).toEqual([
        "cnv_runtime",
        "cnv_lifecycle",
        "cnv_expiryClock"
      ]);
      expect(await call("level.get", { canvas: "cnv_nope" })).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND", details: { id: "cnv_nope" } }
      });
    });

    it("lists the Problems, by severity and level", async () => {
      const { call } = await open();
      expect((await call("problems.list")).result.problems).toHaveLength(14);
      expect((await call("problems.list", { canvas: "cnv_lifecycle" })).result.problems).toHaveLength(3);
      expect((await call("problems.list", { severity: "error" })).result.problems).toEqual([]);
    });

    it("applies a batch as one change, says what it created and which Problems it brought, and undoes it", async () => {
      const { call, document } = await open();
      const applied = await call("batch.apply", {
        label: "A state for late payers",
        commands: [{ type: "node.add", args: { canvas: "cnv_expiryClock", node: { kind: "state", name: "late" } } }]
      });
      expect(applied.result.created).toEqual(["nod_late"]);
      expect(applied.result.problems.added.map(problem => problem.code).sort()).toEqual([
        "machine.stuck",
        "machine.unreachable"
      ]);
      expect((await document()).canvases.cnv_expiryClock.nodes.nod_late).toEqual({ kind: "state", name: "late" });
      expect(await call("history.undo")).toEqual({ ok: true, result: { label: "A state for late payers" } });
      expect((await document()).canvases.cnv_expiryClock.nodes.nod_late).toBeUndefined();
      expect(await call("history.redo")).toEqual({ ok: true, result: { label: "A state for late payers" } });
      expect((await document()).canvases.cnv_expiryClock.nodes.nod_late).toBeDefined();
    });

    it("tells the Problems a change brought by what they are about, not by their words", async () => {
      const { call } = await open();
      const renamed = await call("batch.apply", {
        label: "Rename",
        commands: [{ type: "node.update", args: { id: "nod_expiryClock", set: { name: "expiry_timer" } } }]
      });
      expect(renamed.result.problems).toEqual({ added: [], removed: [] });
    });

    it("refuses a batch that fails, changing nothing, and says which command failed", async () => {
      const { call, document } = await open();
      const result = await call("batch.apply", {
        label: "Two changes",
        commands: [
          { type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } },
          { type: "node.remove", args: { id: "nod_nope" } }
        ]
      });
      expect(result).toMatchObject({ ok: false, error: { code: "NOT_FOUND", details: { index: 1 } } });
      expect((await document()).canvases.cnv_expiryClock.nodes.nod_paused.name).toBe("paused");
    });

    it("runs a level step by step, answering what it asks, and saves the run as a scenario", async () => {
      const { call, document } = await open();
      const started = await call("run.start", {
        canvas: "cnv_lifecycle",
        at: "2026-01-05T09:00:00Z",
        context: { nod_expiryClock: { expiresAt: "2026-01-15T09:00:00Z" } }
      });
      expect(started.result).toEqual({
        point: {
          step: 0,
          do: null,
          active: [
            "nod_complianceHold/nod_clear",
            "nod_expiryClock/nod_running",
            "nod_sendCrossBorder/nod_awaitingFunds"
          ],
          clock: "2026-01-05T09:00:00Z"
        },
        question: null
      });
      expect((await call("run.moves")).result.moves.map(move => move.label)).toContain("verify.started");
      await call("run.step", { do: { event: "evt_payinDetected" } });
      await call("run.step", { do: { event: "evt_payinConfirmed" } });
      const asked = await call("run.step", { do: { event: "evt_legCompleted" } });
      expect(asked.result.point.step).toBe(2);
      expect(asked.result.question).toMatchObject({ kind: "transition", at: "nod_sendCrossBorder/nod_converting" });
      const answered = await call("run.answer", { value: "edg_convertingPayingOut" });
      expect(answered.result.point).toMatchObject({
        step: 3,
        active: expect.arrayContaining(["nod_sendCrossBorder/nod_payingOut"])
      });
      expect(answered.result.question).toBeNull();
      const saved = await call("scenario.save", { name: "Pays out" });
      expect(saved).toEqual({ ok: true, result: { id: "scn_paysOut" } });
      const scenario = (await document()).annotations.scenarios.scn_paysOut;
      expect(scenario).toMatchObject({
        name: "Pays out",
        canvas: "cnv_lifecycle",
        start: { at: "2026-01-05T09:00:00Z" }
      });
      expect(scenario.steps.map(item => item.do)).toEqual([
        { event: "evt_payinDetected" },
        { event: "evt_payinConfirmed" },
        { event: "evt_legCompleted" }
      ]);
      expect(scenario.steps[2].answers).toEqual([
        { kind: "transition", at: "nod_sendCrossBorder/nod_converting", value: "edg_convertingPayingOut" }
      ]);
      expect((await call("scenario.replay", { id: "scn_paysOut" })).result.scenarios).toMatchObject([
        { id: "scn_paysOut", status: "same" }
      ]);
    });

    it("keeps a step that cannot be taken out of the run, and says why", async () => {
      const { call } = await open();
      await call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
      const failed = await call("run.step", { do: { event: "evt_nope" } });
      expect(failed.result).toMatchObject({
        point: { step: 0 },
        failure: { code: "dangling", message: "There is no event evt_nope" }
      });
      expect((await call("run.state")).result).toMatchObject({ points: [{ step: 0 }], failure: { code: "dangling" } });
      expect(await call("run.start", { canvas: "cnv_lifecycle", at: "yesterday" })).toMatchObject({
        ok: false,
        error: { code: "INVALID_ARGS", details: { code: "badInput" } }
      });
      expect(await call("run.step", { do: { event: "evt_payinDetected" } })).toMatchObject({ ok: true });
    });

    it("goes back a step, and stops a run only when its steps are saved or let go", async () => {
      const { call } = await open();
      expect(await call("run.stop")).toEqual({ ok: true, result: { stopped: false } });
      expect(await call("run.moves")).toMatchObject({ ok: false, error: { code: "NOT_ALLOWED" } });
      await call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
      await call("run.step", { do: { event: "evt_verifyStarted" } });
      await call("run.step", { do: { event: "evt_verifyEnded" } });
      expect((await call("run.back")).result.point).toMatchObject({ step: 1, do: { event: "evt_verifyStarted" } });
      expect(await call("run.stop")).toMatchObject({
        ok: false,
        error: { code: "NOT_ALLOWED", details: { unsaved: 1 } }
      });
      expect(await call("run.stop", { discard: true })).toEqual({ ok: true, result: { stopped: true } });
      expect(await call("run.state")).toMatchObject({ ok: false, error: { code: "NOT_ALLOWED" } });
    });

    it("holds the document while a run is on, as the Simulator does: it is edited again once the run stops", async () => {
      const { call } = await open();
      await call("run.start", { canvas: "cnv_lifecycle", at: "2026-01-05T09:00:00Z" });
      const rename = {
        label: "Rename",
        commands: [{ type: "node.update", args: { id: "nod_paused", set: { name: "on hold" } } }]
      };
      expect(await call("batch.apply", rename)).toMatchObject({ ok: false, error: { code: "SIMULATING" } });
      expect(await call("layout.arrange", { canvas: "cnv_runtime" })).toMatchObject({
        ok: false,
        error: { code: "SIMULATING" }
      });
      expect((await call("run.step", { do: { event: "evt_verifyStarted" } })).result.point.step).toBe(1);
      await call("run.stop", { discard: true });
      expect(await call("batch.apply", rename)).toMatchObject({ ok: true });
    });

    it("replays the scenarios, and says where one no longer does what it recorded", async () => {
      const { call } = await open();
      expect((await call("scenario.replay")).result.scenarios.map(item => [item.id, item.status])).toEqual([
        ["scn_paysInTime", "same"],
        ["scn_verificationPausesTheClock", "same"]
      ]);
      await call("batch.apply", {
        label: "No pause",
        commands: [{ type: "edge.remove", args: { id: "edg_runningPaused" } }]
      });
      expect((await call("scenario.replay", { id: "scn_verificationPausesTheClock" })).result.scenarios).toMatchObject([
        { id: "scn_verificationPausesTheClock", status: "diverged", step: 1, reason: "reached" }
      ]);
      expect(await call("scenario.replay", { id: "scn_nope" })).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND", details: { id: "scn_nope" } }
      });
    });

    it("exports the document, a level, the documentation, the contract and a scenario's page", async () => {
      const { call } = await open();
      const document = (await call("export.document")).result;
      expect(document.name).toBe("payments.statewright.json");
      expect(JSON.parse(document.text).project.id).toBe("prj_payments");
      const svg = (await call("export.svg", { canvas: "cnv_expiryClock" })).result;
      expect(svg.name).toBe("payments-expiry-clock.svg");
      expect(svg.text).toMatch(/^<svg /);
      expect((await call("export.markdown")).result).toMatchObject({
        name: "payments.md",
        text: expect.stringMatching(/^# Payments/)
      });
      expect((await call("export.aiPack")).result.name).toBe("payments.ai.md");
      const contract = (await call("export.contract")).result;
      expect(contract).toMatchObject({ name: "payments.contract.json", problems: [] });
      expect(JSON.parse(contract.text)).toMatchObject({ contract: "1", source: { project: "prj_payments" } });
      const page = (await call("export.scenarioPage", { id: "scn_verificationPausesTheClock" })).result;
      expect(page.name).toBe("verification-pauses-the-clock.html");
      expect(page.text).toMatch(/^<!doctype html>/i);
      expect(await call("export.scenarioPage", { id: "scn_nope" })).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND", details: { id: "scn_nope" } }
      });
    });

    it("audits the design: its Problems, its scenarios run again, and how much they cover", async () => {
      const { call } = await open();
      const audit = (await call("audit.report")).result;
      expect(audit.summary).toEqual({
        error: 0,
        warning: expect.any(Number),
        incomplete: expect.any(Number),
        scenarios: 2,
        diverged: 0,
        coverage: 48
      });
      expect((await call("audit.report", { canvas: "cnv_expiryClock" })).result.summary.coverage).toBe(70);
      expect((await call("audit.report", { format: "md" })).result.markdown).toMatch(/^# Audit of Payments\n/);
      expect(await call("audit.report", { canvas: "cnv_nope" })).toMatchObject({
        ok: false,
        error: { code: "NOT_FOUND" }
      });
    });

    it("answers every call with a result its operation's schema accepts", async () => {
      const { call } = await open();
      const calls = [
        ["document.summary"],
        ["level.get", { canvas: "cnv_lifecycle" }],
        ["query.find", { text: "clock" }],
        ["query.usages", { id: "cnv_runtime" }],
        ["query.usages", { id: "evt_verifyStarted" }],
        ["query.path", { id: "nod_paused" }],
        ["problems.list"],
        ["scenario.replay"],
        ["audit.report"],
        ["export.markdown"]
      ];
      for (const [name, args] of calls) {
        const answer = await call(name, args);
        expect(answer.ok, name).toBe(true);
        expect(checkResult(name, answer.result), name).toEqual({ ok: true });
      }
    });

    it("checks the arguments before anything runs", async () => {
      const { call } = await open();
      expect(await call("batch.apply", { commands: [] })).toMatchObject({
        ok: false,
        error: { code: "BAD_ARGUMENTS" }
      });
    });
  });
}
