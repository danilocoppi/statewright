import { useEffect, useLayoutEffect, useRef } from "react";

import { MenuList } from "./Menu";

/**
 * A menu opened at a point (right click, or the menu key), kept inside its positioned parent: the same items and keys
 * as `Menu`; a click outside or Esc closes it and gives the focus back to where it was.
 * @param {{ label: string, sections: import("./Menu").MenuSection[], at: { x: number, y: number },
 *   onClose: () => void }} props `at`: the point, in the coordinates of the positioned parent.
 */
export function ContextMenu({ label, sections, at, onClose }) {
  const ref = useRef(null);
  const before = useRef(document.activeElement);
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  // Near the bottom or the right of the parent, the menu opens up or to the left so it stays whole.
  useLayoutEffect(() => {
    const box = ref.current;
    const parent = box.offsetParent;
    if (!parent) return;
    box.style.left = `${Math.max(8, Math.min(at.x, parent.clientWidth - box.offsetWidth - 8))}px`;
    box.style.top = `${Math.max(8, Math.min(at.y, parent.clientHeight - box.offsetHeight - 8))}px`;
  }, [at.x, at.y]);

  useEffect(() => {
    const focused = before.current;
    const menu = ref.current;
    const onPointerDown = event => !menu.contains(event.target) && close.current();
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      // Unless the chosen item moved the focus on (a field it opened), it goes back to where it was.
      const left = document.activeElement;
      if (focused?.isConnected && (left === document.body || menu.contains(left))) focused.focus();
    };
  }, []);

  return (
    <div ref={ref} className="absolute z-50" style={{ left: at.x, top: at.y }}>
      <MenuList label={label} sections={sections} onClose={onClose} className="w-64" />
    </div>
  );
}
