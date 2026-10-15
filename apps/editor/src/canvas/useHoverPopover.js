import { useViewport } from "@xyflow/react";
import { useEffect, useLayoutEffect, useRef } from "react";
import { useStore } from "zustand";

import { useEditor } from "@/store/editor";

import { besideTarget } from "./hover";

/** How long the pointer rests on a target before its details show. */
const OPEN_MS = 150;
/** How long they wait for the pointer to come back, crossing from the target to them or back. */
const CLOSE_MS = 120;

/**
 * The details of what the pointer rests on, over the canvas (a finding badge, a Problems marker): once the pointer
 * rests on a target, its details show beside it. They stay while the pointer is on the target or on them, so their
 * words can be selected and copied; they go when it leaves both, on Esc, on a press elsewhere and when the view moves
 * or another level is shown. One listener on the canvas watches every target, whoever drew it.
 * @param {{ container: import("react").RefObject<HTMLElement>,
 *   store: ReturnType<typeof import("./hover").createHoverStore>, selector: string,
 *   read: (target: HTMLElement) => { target: string } & object }} options `selector`: the targets; `read`: what one
 *   says (its element, and whatever else its details need), a function that does not change.
 * @returns {{ shown: any, ref: import("react").RefObject<HTMLDivElement>,
 *   hold: { onPointerEnter: () => void, onPointerLeave: (event: PointerEvent) => void } }} `ref` and `hold` go on the
 *   details (HoverCard).
 */
export function useHoverPopover({ container, store, selector, read }) {
  const shown = useStore(store, state => state.shown);
  const canvasId = useEditor(state => state.canvasId);
  const { x, y, zoom } = useViewport();
  const ref = useRef(null);
  const timers = useRef({ open: null, close: null });

  /** The pointer has left: the details go, unless it comes back to the target or to them. */
  const leave = () => {
    clearTimeout(timers.current.close);
    timers.current.close = setTimeout(() => store.getState().close(), CLOSE_MS);
  };
  const stay = () => clearTimeout(timers.current.close);

  // One listener on the canvas sees the pointer come to rest on any target.
  useEffect(() => {
    const canvas = container.current;
    if (!canvas) return;
    const wait = timers.current;
    const targetOf = event => event.target.closest?.(selector) ?? null;
    const onOver = event => {
      const target = targetOf(event);
      if (!target || event.pointerType === "touch" || event.buttons) return;
      clearTimeout(wait.close);
      if (store.getState().shown?.target === target.dataset.target) return;
      clearTimeout(wait.open);
      wait.open = setTimeout(() => {
        const { left, top, right, bottom } = target.getBoundingClientRect();
        store.getState().show({ ...read(target), rect: { left, top, right, bottom } });
      }, OPEN_MS);
    };
    const onOut = event => {
      const target = targetOf(event);
      if (!target || target.contains(event.relatedTarget)) return;
      clearTimeout(wait.open);
      if (store.getState().shown) {
        clearTimeout(wait.close);
        wait.close = setTimeout(() => store.getState().close(), CLOSE_MS);
      }
    };
    canvas.addEventListener("pointerover", onOver);
    canvas.addEventListener("pointerout", onOut);
    return () => {
      canvas.removeEventListener("pointerover", onOver);
      canvas.removeEventListener("pointerout", onOut);
      clearTimeout(wait.open);
      clearTimeout(wait.close);
    };
  }, [container, store, selector, read]);

  // The view moved, or another level is shown: the target is no longer where its details stand.
  useEffect(() => {
    clearTimeout(timers.current.open);
    store.getState().close();
  }, [store, x, y, zoom, canvasId]);

  // Open, they go on Esc (EditorPage leaves it to them) and on a press anywhere else.
  useEffect(() => {
    if (!shown) return;
    const close = () => store.getState().close();
    const onKeyDown = event => event.key === "Escape" && close();
    const onPointerDown = event => !ref.current?.contains(event.target) && close();
    addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [store, shown]);

  // Beside the target, kept inside the window; measured before it is painted.
  useLayoutEffect(() => {
    const box = ref.current;
    if (!box || !shown) return;
    const place = besideTarget(
      shown.rect,
      { w: box.offsetWidth, h: box.offsetHeight },
      { w: innerWidth, h: innerHeight }
    );
    box.style.left = `${place.left}px`;
    box.style.top = `${place.top}px`;
    box.dataset.side = place.side;
  });

  const hold = {
    onPointerEnter: stay,
    onPointerLeave: event => {
      // Selecting their words may take the pointer out while it is pressed: they wait for it to be released.
      if (!event.buttons) return leave();
      document.addEventListener("pointerup", () => !ref.current?.matches(":hover") && leave(), { once: true });
    }
  };
  return { shown, ref, hold };
}
