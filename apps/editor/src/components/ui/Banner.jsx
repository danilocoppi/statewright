import { cn } from "@/lib/cn";

import { Icon } from "./Icon";
import { Island } from "./Island";

const TONES = { warning: "text-warning", info: "text-accent" };

/**
 * A persistent notice that stays until its cause is gone (spec §10): storage unavailable, read-only tab. Position it
 * with `className`.
 * @param {{ tone?: "warning" | "info", children: import("react").ReactNode, actions?: import("react").ReactNode,
 *   className?: string }} props
 */
export function Banner({ tone = "warning", children, actions, className }) {
  return (
    <Island role="status" className={cn("flex items-center gap-3 py-1.5 pl-3.5 pr-1.5", className)}>
      <Icon name="alert" className={cn("shrink-0", TONES[tone])} />
      <span className="min-w-0 flex-1 text-ui text-ink">{children}</span>
      {actions && <span className="flex shrink-0 gap-1">{actions}</span>}
    </Island>
  );
}
