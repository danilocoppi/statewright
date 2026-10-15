import { useId } from "react";

import { cn } from "@/lib/cn";

/**
 * A labelled single-line text input. `error` replaces the hint and marks the input invalid.
 * @param {{ label: string, value: string, onChange: (value: string) => void, hint?: string, error?: string,
 *   autoFocus?: boolean, placeholder?: string, className?: string, testId?: string }} props `testId`: the input's
 *   hook (AI interface spec §7.5).
 */
export function TextField({ label, value, onChange, hint, error, autoFocus, placeholder, className, testId }) {
  const id = useId();
  const messageId = useId();
  const message = error ?? hint;
  return (
    <div className={cn("grid gap-1.5", className)}>
      <label htmlFor={id} className="text-label font-medium text-sub">
        {label}
      </label>
      <input
        id={id}
        data-testid={testId}
        value={value}
        onChange={event => onChange(event.target.value)}
        autoFocus={autoFocus}
        placeholder={placeholder}
        aria-invalid={error ? true : undefined}
        aria-describedby={message ? messageId : undefined}
        className={cn(
          "h-9 rounded-control border border-control-border bg-surface px-3 text-read text-ink outline-none transition-shadow duration-150 placeholder:text-muted focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]",
          error && "border-danger"
        )}
      />
      {message && (
        <p id={messageId} className={cn("text-label", error ? "text-danger" : "text-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}
