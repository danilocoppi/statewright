import { useRef, useState } from "react";

import { cn } from "@/lib/cn";

/**
 * A name typed in place (spec §7.2–§7.3): a field over the box, in the box's own type, that keeps what is typed with
 * Enter or by leaving it and drops it with Esc. Notes take several lines (Shift+Enter starts a new one).
 * @param {{ value: string, label: string, multiline?: boolean, onCommit: (text: string, how: "enter" | "leave") => void,
 *   onCancel: () => void, className?: string }} props
 */
export function NameEditor({ value, label, multiline = false, onCommit, onCancel, className }) {
  const [text, setText] = useState(value);
  const done = useRef(false);
  const finish = (keep, how) => {
    if (done.current) return;
    done.current = true;
    if (keep) onCommit(text, how);
    else onCancel();
  };
  const Field = multiline ? "textarea" : "input";
  return (
    <Field
      aria-label={label}
      // The field is the gesture's own: it takes the focus as it appears.
      autoFocus
      value={text}
      rows={multiline ? 3 : undefined}
      onChange={event => setText(event.target.value)}
      onFocus={event => event.target.select()}
      onBlur={() => finish(true, "leave")}
      onKeyDown={event => {
        if (event.key === "Enter" && !(multiline && event.shiftKey)) {
          event.preventDefault();
          finish(true, "enter");
        } else if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          finish(false);
        }
      }}
      className={cn(
        "nodrag nopan nowheel w-full resize-none bg-transparent text-ink caret-accent outline-none selection:bg-accent-soft",
        className
      )}
    />
  );
}
