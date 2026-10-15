import { useId, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * @typedef {object} PickerOption
 * @property {string} id
 * @property {import("react").ReactNode} label
 * @property {string} [meta] Quiet text on the right ("used once").
 * @property {boolean} [create] An option that adds something (marked +; ↵ when Enter picks it and it says nothing
 *   more).
 * @property {boolean} [disabled] Shown, not picked (a hint).
 * @property {() => void} onPick
 */

/**
 * A field with the catalog items that match what is typed (WAI-ARIA combobox): arrows move through the options,
 * Enter picks the active one, Esc is left to the editor around it.
 * @param {{ label: string, placeholder: string, options: (query: string) => PickerOption[], mono?: boolean,
 *   initial?: string }} props `options` is asked again as the person types.
 */
export function CatalogPicker({ label, placeholder, options, mono = false, initial = "" }) {
  const [query, setQuery] = useState(initial);
  const [active, setActive] = useState(0);
  const listId = useId();
  const list = options(query);
  const enabled = list.map((option, index) => (option.disabled ? -1 : index)).filter(index => index >= 0);
  const current = enabled.includes(active) ? active : (enabled[0] ?? -1);

  const move = step => {
    if (!enabled.length) return;
    const position = Math.max(0, enabled.indexOf(current));
    setActive(enabled[(position + step + enabled.length) % enabled.length]);
  };
  const onKeyDown = event => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      move(event.key === "ArrowDown" ? 1 : -1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (current >= 0) list[current].onPick();
    }
  };

  return (
    <div>
      <input
        role="combobox"
        aria-label={label}
        aria-expanded={list.length > 0}
        aria-controls={listId}
        aria-activedescendant={current >= 0 ? `${listId}-${current}` : undefined}
        aria-autocomplete="list"
        // The field is the editor's first step: it takes the focus as the editor opens.
        autoFocus
        value={query}
        placeholder={placeholder}
        onChange={event => {
          setQuery(event.target.value);
          setActive(0);
        }}
        onKeyDown={onKeyDown}
        className={cn(
          "h-9 w-full rounded-control border border-accent bg-surface px-2.5 text-read text-ink caret-accent outline-none ring-4 ring-accent/12 placeholder:text-muted",
          mono && "font-mono text-[13px]"
        )}
      />
      {list.length > 0 && (
        <ul id={listId} role="listbox" aria-label={label} className="mt-1.5 grid gap-px">
          {list.map((option, index) => (
            <li
              key={option.id}
              id={`${listId}-${index}`}
              role="option"
              aria-selected={index === current}
              aria-disabled={option.disabled || undefined}
              onPointerDown={event => event.preventDefault()}
              onPointerMove={() => !option.disabled && setActive(index)}
              onClick={() => !option.disabled && option.onPick()}
              className={cn(
                "grid min-h-8 cursor-pointer grid-cols-[14px_1fr_auto] items-center gap-2 rounded-control px-2 text-ui",
                index === current && "bg-accent-soft",
                option.disabled && "cursor-default text-muted"
              )}
            >
              <span aria-hidden="true" className={cn("text-center", option.create ? "text-accent" : "text-muted")}>
                {option.create ? "+" : "·"}
              </span>
              <span className="min-w-0 truncate">{option.label}</span>
              <span className="text-label text-muted">
                {option.meta ?? (index === current && option.create ? "↵" : null)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
