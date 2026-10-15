import { cn } from "@/lib/cn";

const VARIANTS = {
  primary: "bg-primary text-primary-foreground hover:opacity-90",
  secondary: "border border-control-border bg-surface text-ink hover:bg-subtle",
  ghost: "text-ink hover:bg-subtle",
  danger: "text-danger hover:bg-danger-soft"
};

const SIZES = { md: "h-8 px-3.5 gap-2", sm: "h-7 px-2.5 gap-1.5" };

/**
 * A button's look, for a <button> (`Button`) or for a link that looks like one.
 * @param {"primary" | "secondary" | "ghost" | "danger"} [variant]
 * @param {"md" | "sm"} [size]
 */
export const buttonClass = (variant = "secondary", size = "md") =>
  cn(
    "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-control text-ui font-medium transition-[background-color,opacity] duration-150 disabled:pointer-events-none disabled:opacity-50",
    SIZES[size],
    VARIANTS[variant]
  );
