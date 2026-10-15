import { useState } from "react";
import { useTranslation } from "react-i18next";

import { Icon } from "@/components/ui/Icon";
import { CatalogPicker } from "@/editing/CatalogPicker";
import { cn } from "@/lib/cn";

/**
 * "+ Add …" that becomes a field finding what to add (the trigger editor's completion): picking closes it, and so do
 * Esc and leaving the field — without closing the inspector.
 * @param {{ label: string, placeholder: string, options: (query: string) => import("@/editing/CatalogPicker").PickerOption[],
 *   mono?: boolean, disabled?: boolean, open?: boolean, onOpenChange?: (open: boolean) => void }} props
 */
export function AddPicker({ label, placeholder, options, mono = false, disabled = false, open, onOpenChange }) {
  const [own, setOwn] = useState(false);
  const shown = open ?? own;
  const setShown = next => (onOpenChange ?? setOwn)(next);
  if (!shown) {
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => setShown(true)}
        className="inline-flex h-7 items-center gap-1 text-ui font-medium text-accent hover:underline disabled:hidden"
      >
        <Icon name="plus" size={13} />
        {label}
      </button>
    );
  }
  return (
    <div
      onKeyDown={event => {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        setShown(false);
      }}
      onBlur={event => !event.currentTarget.contains(event.relatedTarget) && setShown(false)}
    >
      <CatalogPicker
        label={placeholder}
        placeholder={placeholder}
        mono={mono}
        options={query =>
          options(query).map(option => ({
            ...option,
            onPick: () => {
              setShown(false);
              option.onPick();
            }
          }))
        }
      />
    </div>
  );
}

/**
 * The items of a list field as chips, each with a button that takes it out.
 * @param {{ items: Array<{ key: string, label: import("react").ReactNode, mono?: boolean, style?: object }>,
 *   onRemove?: (key: string) => void, removeLabel: (label: string) => string }} props `onRemove` absent: read-only.
 */
export function Chips({ items, onRemove, removeLabel }) {
  const { t } = useTranslation("inspector");
  if (!items.length) return <p className="py-1 text-ui text-muted">{t("refs.none")}</p>;
  return (
    <ul className="flex flex-wrap gap-1">
      {items.map(item => (
        <li
          key={item.key}
          style={item.style}
          className={cn(
            "inline-flex h-6 max-w-full items-center gap-1 rounded-[6px] border border-control-border bg-surface pl-2 text-[12px] text-ink",
            item.mono && "font-mono text-[11.5px]",
            !onRemove && "pr-2"
          )}
        >
          <span className="truncate">{item.label}</span>
          {onRemove && (
            <button
              type="button"
              aria-label={removeLabel(typeof item.label === "string" ? item.label : item.key)}
              onClick={() => onRemove(item.key)}
              className="grid size-5 shrink-0 place-items-center rounded-[5px] text-muted hover:bg-subtle hover:text-ink"
            >
              <Icon name="close" size={11} />
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}
