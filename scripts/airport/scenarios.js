// Scenarios recorded by the simulator, as a person would record them in the Editor: each machine's main path, and
// what goes wrong.
import { applyBatch } from "statewright";
import { reachedOf, start, step } from "statewright/simulate";

const AT = "2026-10-01T06:00:00Z";

/** Run `steps` (events, or `{ event, answers }`) on a machine and keep the run as a scenario. */
function record(doc, { name, description, canvas, entry, steps }) {
  let { session } = start(doc, { canvas, at: AT, ...(entry ? { entry } : {}) });
  const recorded = [];
  for (const each of steps) {
    // An event's ID, time passing to the next timer ("next"), or `{ event, pick }`: a question asked on the way is
    // answered with the candidate leading to `pick` (by name), or else with the `else` branch.
    const { pick, ...plain } = typeof each === "object" ? each : {};
    const input =
      each === "next" ? { do: { wait: "next" } }
      : typeof each === "string" ? { do: { event: each } }
      : { do: { event: plain.event } };
    const answers = [];
    let result = step(doc, session, input);
    for (let asked = 0; result.status === "needs" && asked < 8; asked += 1) {
      const { question } = result;
      const chosen =
        question.candidates.find(candidate => pick && candidate.to === pick) ??
        question.candidates.find(candidate => candidate.else) ??
        question.candidates[0];
      answers.push({ kind: question.kind, at: question.at, value: chosen.value });
      result = step(doc, session, { ...input, answers });
    }
    if (!result.session || result.status === "needs" || result.status === "error") {
      const why = { ...result, session: undefined };
      throw new Error(`${name}: ${JSON.stringify(input.do)}: ${JSON.stringify(why).slice(0, 600)}`);
    }
    session = result.session;
    recorded.push({ ...input, ...(answers.length ? { answers } : {}), reached: reachedOf(session) });
  }
  return {
    type: "scenario.add",
    args: { scenario: { name, description, canvas, start: { at: AT, ...(entry ? { entry } : {}) }, steps: recorded } }
  };
}

export function recordScenarios(doc) {
  const runs = [
    {
      name: "A departure on time",
      description: "From the schedule to the hand-off, no ice, no delay.",
      canvas: "cnv_flightLifecycle",
      steps: [
        "evt_ctotIssued",
        "evt_standAllocated",
        "next",
        "next",
        "evt_boardingStarted",
        "evt_doorsClosed",
        "evt_aircraftOffBlock",
        "evt_taxiStarted",
        "evt_aircraftAirborne"
      ]
    },
    {
      name: "A delay, then a new slot",
      description: "A delay while check-in is open; the network manager revises the slot and the flight goes on.",
      canvas: "cnv_flightLifecycle",
      steps: ["evt_ctotIssued", "evt_standAllocated", "next", "evt_flightDelayed", "evt_ctotRevised"]
    },
    {
      name: "The airline cancels",
      canvas: "cnv_flightLifecycle",
      description: "Cancelled after the stand was allocated: passengers told, stand released.",
      steps: ["evt_ctotIssued", "evt_standAllocated", "evt_flightCancelled"]
    },
    {
      name: "A bag from the drop to the hold",
      description: "Cleared by the machine, sorted, built into a container, flown.",
      canvas: "cnv_bagLifecycle",
      steps: ["evt_bagInducted", "evt_bagScreened", "evt_bagSorted", "evt_bagLoaded", "evt_aircraftAirborne"]
    },
    {
      name: "A lane in alarm",
      description: "A tray alarms; the hand search clears it.",
      canvas: "cnv_securityLane",
      steps: ["evt_laneStaffed", "evt_laneSelfTested", "evt_screeningAlarm", "evt_searchStarted", "evt_searchClear"]
    },
    {
      name: "A stand's day",
      description: "Allocated, occupied, cleared, free again.",
      canvas: "cnv_standLifecycle",
      steps: ["evt_standAllocated", "evt_aircraftOnBlock", "evt_aircraftOffBlock", "evt_standInspected"]
    }
  ];
  let built = doc;
  for (const run of runs) built = applyBatch(built, [record(built, run)]).doc;
  return built;
}
