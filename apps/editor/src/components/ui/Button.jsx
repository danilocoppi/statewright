import { cn } from "@/lib/cn";

import { buttonClass } from "./buttonClass";

/**
 * A button. Takes everything a <button> takes, plus `variant` (primary | secondary | ghost | danger) and `size`
 * (md | sm).
 */
export function Button({ variant = "secondary", size = "md", className, type = "button", ref, ...props }) {
  return <button ref={ref} type={type} className={cn(buttonClass(variant, size), className)} {...props} />;
}

/** A square, icon-only button; `label` is required and becomes its accessible name and tooltip. */
export function IconButton({ label, className, children, ref, ...props }) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "grid size-8 shrink-0 place-items-center rounded-control text-sub transition-colors duration-150 hover:bg-subtle hover:text-ink disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
