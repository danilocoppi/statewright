import { describe, expect, it } from "vitest";

import { transitionAt } from "@/canvas/useConnect";

const edge = (id, points, label = null, type = "figure") => ({
  id,
  type,
  data: { part: { id: id.split("/").at(-1), points }, label }
});

describe("the transition under a point where a connection is dropped", () => {
  const edges = [
    edge(
      "edg_a",
      [
        [0, 0],
        [100, 0]
      ],
      { x: 30, y: -8, w: 40, h: 14 }
    ),
    edge("nod_frame/edg_b", [
      [0, 100],
      [0, 200]
    ]),
    edge(
      "sends:x:y",
      [
        [0, 0],
        [100, 100]
      ],
      null,
      "association"
    )
  ];

  it("finds a transition by its label, or near its route, inside a frame too", () => {
    expect(transitionAt(edges, { x: 50, y: -4 })).toBe("edg_a");
    expect(transitionAt(edges, { x: 90, y: 3 })).toBe("edg_a");
    expect(transitionAt(edges, { x: 4, y: 150 })).toBe("edg_b");
  });

  it("finds nothing far from every transition, and never a connector", () => {
    expect(transitionAt(edges, { x: 60, y: 60 })).toBeNull();
  });
});
