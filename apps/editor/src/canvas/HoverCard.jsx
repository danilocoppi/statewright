/** A small mono chip in capitals, as the diagrams' chips are: a severity in the details. */
export const CHIP =
  "inline-flex h-[18px] shrink-0 items-center font-mono text-[9.5px] font-semibold uppercase tracking-[0.04em]";

/**
 * The details shown beside a target, in the dialog's look (a non-modal dialog): their items, one under another and
 * scrolled when many, and an action at their foot when there is one.
 * @param {{ ref: import("react").RefObject<HTMLDivElement>, hold: object, label: string, testId: string,
 *   action?: { label: string, onClick: () => void }, children: import("react").ReactNode }} props `ref` and `hold`:
 *   from useHoverPopover.
 */
export function HoverCard({ ref, hold, label, testId, action, children }) {
  return (
    <div
      ref={ref}
      role="dialog"
      aria-modal="false"
      aria-label={label}
      data-testid={testId}
      {...hold}
      className="fixed left-0 top-0 z-30 flex w-max max-w-[min(360px,calc(100vw-16px))] select-text flex-col overflow-hidden rounded-island border border-island-border bg-surface text-ink shadow-dialog motion-safe:animate-[fade-in_160ms_var(--ease-soft)]"
    >
      <ul className="max-h-[min(340px,calc(100vh-72px))] divide-y divide-hairline overflow-y-auto overscroll-contain [scrollbar-color:var(--control-border)_transparent] [scrollbar-width:thin]">
        {children}
      </ul>
      {action && (
        <div className="flex justify-end border-t border-hairline px-3.5 py-2">
          <button
            type="button"
            onClick={action.onClick}
            className="text-label font-medium text-accent hover:underline focus-visible:underline"
          >
            {action.label}
          </button>
        </div>
      )}
    </div>
  );
}
