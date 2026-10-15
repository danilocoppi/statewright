import { cn } from "@/lib/cn";

/**
 * One field in the inspector: in Basics its label above the value, in Details label and value side by side (mockup
 * 09) — except wide values (choices, lists, JSON), which keep the whole width under their label. A refused value is
 * said under it, in plain words, with Core's own message.
 * @param {{ label: string, layer: "basics" | "details", wide?: boolean, hideLabel?: boolean, htmlFor?: string,
 *   error?: { reason: string, message: string } | null, className?: string, children: import("react").ReactNode }} props
 *   `hideLabel`: the label is said, not shown (a tab already names the value).
 */
export function Row({ label, layer, wide = false, hideLabel = false, htmlFor, error, className, children }) {
  const Label = htmlFor ? "label" : "span";
  const side = layer === "details" && !wide;
  return (
    <div
      data-testid="inspector-field"
      className={cn(side ? "grid grid-cols-[104px_minmax(0,1fr)] items-start gap-x-3" : "grid gap-1.5", className)}
    >
      <Label htmlFor={htmlFor} className={cn("text-label text-muted", side && "pt-[7px]", hideLabel && "sr-only")}>
        {label}
      </Label>
      <div className="min-w-0">
        {children}
        {error && (
          <p role="alert" className="mt-1 text-label text-danger">
            {error.reason}{" "}
            <span lang="en" className="font-mono text-[10.5px] text-muted">
              {error.message}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
