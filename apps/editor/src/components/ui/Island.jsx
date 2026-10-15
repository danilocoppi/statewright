import { cn } from "@/lib/cn";

/**
 * A floating island: the translucent surface every tool group sits on (spec §6.1). Position it with `className`
 * (for example `fixed left-4 top-4`).
 */
export function Island({ as: Tag = "div", className, ...props }) {
  return (
    <Tag
      className={cn(
        "rounded-island border border-island-border bg-island shadow-island backdrop-blur-md backdrop-saturate-150",
        className
      )}
      {...props}
    />
  );
}
