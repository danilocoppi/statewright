import { useEffect, useId, useRef } from "react";

import { cn } from "@/lib/cn";

/**
 * A modal dialog on the native <dialog>: the browser traps focus, makes the page inert and closes on Esc (which
 * calls `onClose`). Clicking the backdrop also calls `onClose` unless `dismissable` is false.
 * @param {{ open: boolean, onClose: () => void, title: string, description?: import("react").ReactNode,
 *   icon?: import("react").ReactNode, actions?: import("react").ReactNode, dismissable?: boolean,
 *   className?: string, children?: import("react").ReactNode, testId?: string }} props `testId`: the dialog's hook
 *   (AI interface spec §7.5).
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  icon,
  actions,
  dismissable = true,
  className,
  children,
  testId
}) {
  const ref = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      data-testid={testId}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onCancel={event => {
        event.preventDefault();
        onClose();
      }}
      onClick={event => {
        if (dismissable && event.target === ref.current) onClose();
      }}
      className={cn(
        "m-auto w-[min(560px,calc(100vw-32px))] rounded-dialog bg-surface p-0 text-ink shadow-dialog backdrop:bg-scrim open:motion-safe:animate-[dialog-in_160ms_var(--ease-soft)] backdrop:motion-safe:animate-[fade-in_160ms_ease-out]",
        className
      )}
    >
      {open && (
        <div className="px-6 pb-5 pt-6">
          <h2 id={titleId} className="flex items-center gap-2.5 text-title font-semibold tracking-tight">
            {icon}
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-1.5 text-read leading-relaxed text-sub">
              {description}
            </div>
          )}
          {children && <div className="mt-4">{children}</div>}
          {actions && <div className="mt-5 flex flex-wrap justify-end gap-2">{actions}</div>}
        </div>
      )}
    </dialog>
  );
}
