import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";

import { cn } from "@/lib/cn";

import { Kbd } from "./Chip";
import { Icon } from "./Icon";

/**
 * @typedef {{ id: string, label: string, hint?: string, shortcut?: string, icon?: import("react").ReactNode,
 *   checked?: boolean, toggle?: boolean, disabled?: boolean, onSelect: () => void }} MenuItem `checked` makes the item
 *   one choice of several (a radio item with a check mark), or with `toggle` a setting on its own (a checkbox item).
 * @typedef {{ title?: string, items: MenuItem[] }} MenuSection
 */

/**
 * The items of a menu (WAI-ARIA menu): the first enabled item takes the focus; arrows, Home and End move; Enter or
 * Space runs the item; Esc closes; Tab closes and moves on.
 * @param {{ id?: string, label: string, sections: MenuSection[], onClose: () => void, onTab?: () => void,
 *   className?: string, style?: object }} props `onClose` is called before an item runs.
 */
export function MenuList({ id, label, sections, onClose, onTab = onClose, className, style, testId }) {
  const items = sections.flatMap(section => section.items);
  const enabled = items.map((item, index) => (item.disabled ? -1 : index)).filter(index => index >= 0);
  const [active, setActive] = useState(enabled[0] ?? 0);
  const itemRefs = useRef([]);

  useEffect(() => {
    itemRefs.current[active]?.focus();
  }, [active]);

  const run = item => {
    if (item.disabled) return;
    onClose();
    item.onSelect();
  };
  const move = step => {
    const position = enabled.indexOf(active);
    setActive(enabled[(position + step + enabled.length) % enabled.length]);
  };
  const onKeyDown = event => {
    const keys = {
      ArrowDown: () => move(1),
      ArrowUp: () => move(-1),
      Home: () => setActive(enabled[0]),
      End: () => setActive(enabled.at(-1)),
      Escape: onClose,
      Tab: onTab
    };
    if (keys[event.key]) {
      if (event.key !== "Tab") event.preventDefault();
      keys[event.key]();
    } else if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      run(items[active]);
    }
  };

  // Position of each section's first item in the flat list of items.
  const offsets = sections.map((_, sectionIndex) =>
    sections.slice(0, sectionIndex).reduce((count, section) => count + section.items.length, 0)
  );
  return (
    <div
      id={id}
      role="menu"
      aria-label={label}
      data-testid={testId && `${testId}-list`}
      onKeyDown={onKeyDown}
      style={style}
      className={cn(
        "z-50 min-w-60 rounded-island border border-island-border bg-surface p-1.5 shadow-island motion-safe:animate-[menu-in_140ms_var(--ease-soft)]",
        className
      )}
    >
      {sections.map((section, sectionIndex) => (
        <div key={section.title ?? sectionIndex} role="group" aria-label={section.title}>
          {sectionIndex > 0 && <div className="mx-1.5 my-1 border-t border-hairline" />}
          {section.title && <div className="px-2.5 pb-1 pt-2 text-label text-muted">{section.title}</div>}
          {section.items.map((item, position) => {
            const itemIndex = offsets[sectionIndex] + position;
            return (
              <button
                key={item.id}
                ref={element => (itemRefs.current[itemIndex] = element)}
                data-testid={testId && `${testId}-${item.id}`}
                type="button"
                role={
                  item.checked === undefined ? "menuitem"
                  : item.toggle ?
                    "menuitemcheckbox"
                  : "menuitemradio"
                }
                aria-checked={item.checked}
                tabIndex={itemIndex === active ? 0 : -1}
                aria-disabled={item.disabled || undefined}
                onClick={() => run(item)}
                onPointerMove={() => !item.disabled && setActive(itemIndex)}
                className={cn(
                  "grid w-full grid-cols-[auto_1fr_auto] items-center gap-x-2.5 rounded-control px-2.5 py-1.5 text-left outline-none",
                  itemIndex === active && "bg-subtle",
                  item.disabled && "opacity-45"
                )}
              >
                <span className="text-sub">
                  {item.checked === undefined ?
                    item.icon
                  : item.checked ?
                    <Icon name="check" />
                  : <span className="inline-block size-4" />}
                </span>
                <span className="min-w-0">
                  <span className="block text-ink">{item.label}</span>
                  {item.hint && <span className="block truncate text-label text-muted">{item.hint}</span>}
                </span>
                {item.shortcut ?
                  <Kbd>{item.shortcut}</Kbd>
                : <span />}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Between a menu's button and the menu (`top-[calc(100%+8px)]`), and kept free below the menu, in pixels. */
const GAP = 8;
const MARGIN = 16;
/** The least height a menu is given, however close to the bottom its button is. */
const MIN_ROOM = 160;

/**
 * A dropdown menu (WAI-ARIA menu button): click or ArrowDown opens it; arrows, Home and End move; Enter or Space
 * runs the item; Esc closes and returns focus to the trigger; a click outside closes it.
 * @param {{ label: string, sections: MenuSection[], align?: "start" | "end", className?: string,
 *   menuClassName?: string, trigger: (props: object) => import("react").ReactNode, testId?: string }} props `trigger`
 *   renders the button; spread the props it receives onto it. `menuClassName` sizes the popup (for example `w-80`).
 *   `testId`: the hook of the button (AI interface spec §7.5); the menu is `<testId>-list`, an item `<testId>-<id>`.
 */
export function Menu({ label, sections, align = "end", className, menuClassName, trigger, testId }) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();
  // The room below the button: a menu taller than it scrolls, so its last items can be reached in a short window.
  const [room, setRoom] = useState(null);

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () =>
      setRoom(Math.max(MIN_ROOM, innerHeight - containerRef.current.getBoundingClientRect().bottom - GAP - MARGIN));
    measure();
    addEventListener("resize", measure);
    return () => removeEventListener("resize", measure);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = event => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus();
  };
  return (
    <div ref={containerRef} className={cn("relative", className)}>
      {trigger({
        ref: triggerRef,
        "aria-haspopup": "menu",
        "aria-expanded": open,
        "aria-controls": open ? menuId : undefined,
        "data-testid": testId,
        onClick: () => setOpen(current => !current),
        onKeyDown: event => {
          if (event.key === "ArrowDown") {
            event.preventDefault();
            setOpen(true);
          }
        }
      })}
      {open && (
        <MenuList
          id={menuId}
          label={label}
          sections={sections}
          testId={testId}
          onClose={close}
          onTab={() => setOpen(false)}
          style={{ maxHeight: room ?? undefined }}
          className={cn(
            "absolute top-[calc(100%+8px)] overflow-y-auto overscroll-contain",
            align === "end" ? "right-0" : "left-0",
            menuClassName
          )}
        />
      )}
    </div>
  );
}
