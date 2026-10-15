import { cn } from "@/lib/cn";

/** A small mono label in capitals, as in the diagrams' chips (stage, kind). */
export function Chip({ className, children }) {
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-chip border border-control-border px-1.5 font-mono text-[9.5px] font-medium uppercase tracking-[0.04em] text-sub",
        className
      )}
    >
      {children}
    </span>
  );
}

/** A keyboard key. */
export function Kbd({ className, children }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-[18px] min-w-[18px] items-center justify-center rounded-chip border border-control-border px-1 font-mono text-[10px] font-medium text-sub",
        className
      )}
    >
      {children}
    </kbd>
  );
}
