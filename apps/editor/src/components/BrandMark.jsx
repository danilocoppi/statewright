import { cn } from "@/lib/cn";

/** The Statewright mark: three lines of a specification on an ink tile. */
export function BrandMark({ className }) {
  return (
    <span className={cn("grid size-[22px] place-items-center rounded-[6px] bg-primary", className)} aria-hidden="true">
      <svg width="12" height="12" viewBox="0 0 12 12">
        <path
          d="M2 3h8M2 6h5M2 9h8"
          className="stroke-primary-foreground"
          strokeWidth="1.4"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    </span>
  );
}
