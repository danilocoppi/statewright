import { describe, expect, it } from "vitest";

import { closes, readMark, regionAt } from "@/marks/read";

// Three boxes in a row and one below; an edge from A to B.
const boxes = [
  { id: "a", name: "A", x: 0, y: 0, width: 100, height: 40 },
  { id: "b", name: "B", x: 200, y: 0, width: 100, height: 40 },
  { id: "c", name: "C", x: 400, y: 0, width: 100, height: 40 },
  { id: "d", name: "D", x: 0, y: 200, width: 100, height: 40 }
];
const lines = [
  {
    id: "e",
    name: "go",
    points: [
      [100, 20],
      [200, 20]
    ]
  }
];
const geometry = { boxes, lines };
const names = list => (list ?? []).map(item => item.id);

/** A closed polygon through these corners, as a pencil draws it: points every 10 units. */
function traced(corners) {
  const points = [];
  for (let index = 0; index < corners.length; index += 1) {
    const [x1, y1] = corners[index];
    const [x2, y2] = corners[(index + 1) % corners.length];
    const steps = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 10));
    for (let step = 0; step < steps; step += 1)
      points.push([x1 + ((x2 - x1) * step) / steps, y1 + ((y2 - y1) * step) / steps]);
  }
  points.push(corners[0]);
  return points;
}

describe("reading a mark (collaboration spec §5.2)", () => {
  it("reads a rectangle as the boxes whose centres it holds, and those its border crosses", () => {
    const read = readMark({ kind: "rectangle", rect: { x: -20, y: -20, width: 340, height: 80 } }, geometry);
    expect(names(read.encloses)).toEqual(["a", "b", "e"]);
    const crossing = readMark({ kind: "rectangle", rect: { x: 350, y: -20, width: 80, height: 80 } }, geometry);
    expect(names(crossing.encloses)).toEqual([]);
    expect(names(crossing.touches)).toEqual(["c"]);
  });

  it("reads an ellipse by the ellipse, not by its frame", () => {
    // The frame holds D's centre (50, 220) near its corner; the ellipse does not.
    const read = readMark({ kind: "ellipse", rect: { x: 30, y: 205, width: 400, height: 60 } }, geometry);
    expect(names(read.encloses)).toEqual([]);
    expect(names(read.touches)).toEqual(["d"]);
    const around = readMark({ kind: "ellipse", rect: { x: -40, y: 180, width: 180, height: 80 } }, geometry);
    expect(names(around.encloses)).toEqual(["d"]);
  });

  it("reads a closed stroke as what it surrounds, a scribble included", () => {
    expect(
      closes(
        traced([
          [-20, -20],
          [130, -20],
          [130, 60],
          [-20, 60]
        ])
      )
    ).toBe(true);
    const read = readMark(
      {
        kind: "stroke",
        points: traced([
          [-20, -20],
          [130, -20],
          [130, 60],
          [-20, 60]
        ])
      },
      geometry
    );
    expect(names(read.encloses)).toEqual(["a"]);
    // A figure eight whose loops both hold B: still B, not nothing.
    const eight = traced([
      [180, -20],
      [330, 60],
      [330, -20],
      [180, 60]
    ]);
    expect(names(readMark({ kind: "stroke", points: eight }, geometry).encloses)).toEqual(["b"]);
  });

  it("reads a stroke from one box to another as an arrow, touching what lies between", () => {
    const points = [];
    for (let x = 50; x <= 450; x += 10) points.push([x, 20]);
    const read = readMark({ kind: "stroke", points }, geometry);
    expect(read.from).toEqual({ id: "a", name: "A" });
    expect(read.to).toEqual({ id: "c", name: "C" });
    expect(names(read.touches)).toEqual(["b", "e"]);
    expect(read.encloses).toBeUndefined();
  });

  it("reads an open stroke as what it crosses", () => {
    const points = [];
    for (let y = -40; y <= 260; y += 10) points.push([60, y]);
    expect(closes(points)).toBe(false);
    expect(names(readMark({ kind: "stroke", points }, geometry).touches)).toEqual(["a", "d"]);
  });

  it("names the box nearest a label, within 48 units", () => {
    expect(readMark({ kind: "label", at: [130, 50], text: "here" }, geometry).near).toEqual({ id: "a", name: "A" });
    expect(readMark({ kind: "label", at: [300, 150], text: "far" }, geometry)).toEqual({});
  });

  it("reads nothing from a mark over nothing", () => {
    expect(readMark({ kind: "rectangle", rect: { x: 600, y: 600, width: 10, height: 10 } }, geometry)).toEqual({});
  });

  it("finds the region under a point, the innermost when regions nest", () => {
    const regions = [
      { id: "outer", name: "Outer", x: 0, y: 0, width: 500, height: 500 },
      { id: "inner", name: "Inner", x: 100, y: 100, width: 100, height: 100 }
    ];
    expect(regionAt(regions, [150, 150])).toBe("inner");
    expect(regionAt(regions, [20, 20])).toBe("outer");
    expect(regionAt(regions, [900, 20])).toBeNull();
  });
});
