import { useLayoutEffect } from "react";

/** Room kept between a popover and the edges of the canvas. */
const MARGIN = 8;

/**
 * Keep a popover on the canvas whole: near an edge of its positioned parent it moves in, by its margins. The popover
 * is placed by `left` (its centre, as `-translate-x-1/2` makes it) and `top`; it is measured by its layout size, which
 * its entrance animation does not change. Measured after every render, as the view moves under it. A popover placed
 * under something (the box it will insert, the label it edits) says where its bottom may rest above that thing
 * (`data-above`): when it does not fit below, it goes there rather than over what it is about.
 * @param {import("react").RefObject<HTMLElement>} ref
 */
export function useInside(ref) {
  useLayoutEffect(() => {
    const box = ref.current;
    const parent = box?.offsetParent;
    if (!box || !parent) return;
    const left = parseFloat(box.style.left) - box.offsetWidth / 2;
    const right = left + box.offsetWidth;
    const top = parseFloat(box.style.top);
    const bottom = top + box.offsetHeight;
    const above = box.dataset.above === undefined ? null : Number(box.dataset.above);
    const dx =
      right > parent.clientWidth - MARGIN ? parent.clientWidth - MARGIN - right
      : left < MARGIN ? MARGIN - left
      : 0;
    const dy =
      bottom <= parent.clientHeight - MARGIN ? 0
      : above !== null && above - box.offsetHeight >= MARGIN ? above - box.offsetHeight - top
      : parent.clientHeight - MARGIN - bottom;
    box.style.marginLeft = `${dx}px`;
    box.style.marginTop = `${dy}px`;
  });
}

/** Between a callout and the point it is about. */
const GAP = 14;

/**
 * Keep a callout about a point (a refused gesture) on the canvas: drawn above the point (`data-side="above"`), or
 * below it where there is no room above (`data-side="below"`), and moved in from the left and right edges. Placed by
 * `left` (its centre) and `top` (the point), measured after every render as the view moves under it.
 * @param {import("react").RefObject<HTMLElement>} ref
 */
export function useAbovePoint(ref) {
  useLayoutEffect(() => {
    const box = ref.current;
    const parent = box?.offsetParent;
    if (!box || !parent) return;
    const left = parseFloat(box.style.left) - box.offsetWidth / 2;
    const right = left + box.offsetWidth;
    box.dataset.side = parseFloat(box.style.top) - box.offsetHeight - GAP < MARGIN ? "below" : "above";
    const dx =
      right > parent.clientWidth - MARGIN ? parent.clientWidth - MARGIN - right
      : left < MARGIN ? MARGIN - left
      : 0;
    box.style.marginLeft = `${dx}px`;
  });
}
