// What people and engines left on the design: review comments (one answered by the agent, one resolved), locks on
// what the operations centre has signed off, and an audit's findings.

const AT = "2026-10-01T09:00:00.000Z";
const LATER = "2026-10-01T09:40:00.000Z";

export function review() {
  return [
    {
      type: "comment.add",
      args: {
        id: "cmt_holdingLimit",
        canvas: "cnv_flightLifecycle",
        target: "nod_taxiingOut",
        text: "Is 40 minutes at the holding point the right limit in winter, with de-icing queues?",
        time: AT
      }
    },
    {
      type: "comment.reply",
      args: {
        id: "cmt_holdingLimit",
        text: "The de-icing pads add up to 25 minutes in the worst week; 40 still covers it, but it is close.",
        author: "agent",
        name: "claude-code",
        time: LATER
      }
    },
    {
      type: "comment.add",
      args: {
        id: "cmt_terminalD",
        canvas: "cnv_beltNetwork",
        target: "nod_edsD5",
        text: "Until D5 and D6 exist, can terminal C's machines take D's peak?",
        time: AT
      }
    },
    {
      type: "comment.add",
      args: {
        id: "cmt_reclaimSizes",
        canvas: "cnv_beltNetwork",
        target: "nod_reclaim11",
        text: "Oversize is two belts, not one.",
        time: AT
      }
    },
    { type: "comment.resolve", args: { id: "cmt_reclaimSizes" } },
    {
      type: "comment.add",
      args: {
        id: "cmt_remoteBoarding",
        canvas: "cnv_standPlan",
        at: { x: 900, y: 2600 },
        text: "Remote stands need a bus plan per wave, not per flight.",
        time: AT
      }
    },
    {
      type: "lock.add",
      args: { id: "lck_flightLifecycle", target: "cnv_flightLifecycle", note: "Signed off by the APOC" }
    },
    {
      type: "lock.add",
      args: { id: "lck_alarmResolution", target: "cnv_alarmResolution", note: "Regulated: EU 2015/1998" }
    },
    { type: "lock.add", args: { id: "lck_sorterA", target: "nod_sorterA" } },
    {
      type: "finding.upsert",
      args: {
        id: "fnd_legacyFeed",
        finding: {
          code: "L1",
          title: "Wayfinding still polls the old displays feed",
          severity: "medium",
          description: "The FTP feed is polled every 60 s; gate changes reach the signs a minute late.",
          targets: ["nod_legacyFeed", "nod_wayfinding"],
          source: "audit"
        }
      }
    },
    {
      type: "finding.upsert",
      args: {
        id: "fnd_noShowWindow",
        finding: {
          code: "B2",
          title: "No-shows' bags wait two hours before they count as mishandled",
          severity: "low",
          description: "A rush tag after two hours misses the next bank of departures.",
          targets: ["nod_offloadedBag"],
          source: "audit"
        }
      }
    }
  ];
}
