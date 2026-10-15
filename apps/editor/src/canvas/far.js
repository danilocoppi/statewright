// Far out (performance spec §3 P2): below FAR_ZOOM a box's name is too small to read, so boxes draw as their outline
// and fill and arrows as their line — the same places, sizes and colours as Core's drawing, without its text and
// markup — and a large level mounts and repaints a fraction of what it would.
import { createContext } from "react";

/** Below this zoom a box's 12 px name is under 5 px on screen. */
export const FAR_ZOOM = 0.4;

/** Whether the canvas is far out. */
export const FarContext = createContext(false);

const looks = new WeakMap();

const attribute = (svg, name) => svg.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1];

/**
 * A part's look far out, read from Core's markup of it: the fill, outline and corner of its first shape, or an
 * arrow's line colour.
 * @param {{ svg: string }} part
 * @returns {{ fill?: string, stroke?: string, radius?: number }}
 */
export function farLook(part) {
  let look = looks.get(part);
  if (!look) {
    const svg = part.svg ?? "";
    const fill = attribute(svg, "fill");
    const rx = attribute(svg, "rx");
    look = {
      fill: fill && fill !== "none" ? fill : undefined,
      stroke: attribute(svg, "stroke"),
      radius: rx === undefined ? undefined : Number(rx)
    };
    looks.set(part, look);
  }
  return look;
}
