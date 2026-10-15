import { useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * A segmented control (a radio group): click an option, or move with the arrow keys. `pills`: the options as separate
 * pills that wrap onto more lines, for choices too long for one row.
 * @param {{ label: string, value: string, onChange: (value: string) => void, className?: string, disabled?: boolean,
 *   pills?: boolean, options: Array<{ value: string, label: string, icon?: import("react").ReactNode }> }} props
 */
export function Segmented({ label, value, onChange, options, className, disabled = false, pills = false }) {
  const refs = useRef([]);
  const select = index => {
    const option = options[(index + options.length) % options.length];
    onChange(option.value);
    refs.current[options.indexOf(option)]?.focus();
  };
  const current = Math.max(
    0,
    options.findIndex(option => option.value === value)
  );

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        pills ? "flex flex-wrap gap-1" : "inline-flex rounded-control border border-control-border p-0.5",
        className
      )}
    >
      {options.map((option, index) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={element => (refs.current[index] = element)}
            type="button"
            role="radio"
            aria-checked={checked}
            tabIndex={index === current ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            onKeyDown={event => {
              if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                event.preventDefault();
                select(index + 1);
              }
              if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                event.preventDefault();
                select(index - 1);
              }
            }}
            className={cn(
              "inline-flex h-7 items-center gap-1.5 whitespace-nowrap rounded-[6px] text-ui transition-colors duration-150",
              pills ? "border px-2.5" : "px-3",
              checked ? "border-primary bg-primary text-primary-foreground"
              : pills ? "border-control-border text-sub enabled:hover:border-muted enabled:hover:text-ink"
              : "text-sub enabled:hover:text-ink"
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
