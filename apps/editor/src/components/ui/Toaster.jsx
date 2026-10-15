import { useTranslation } from "react-i18next";

import { cn } from "@/lib/cn";
import { useToastStore } from "@/stores/toast";

import { Icon } from "./Icon";

const DOT = { success: "bg-success", error: "bg-danger", info: "hidden", ai: "bg-accent" };

/** Draws the toasts at the bottom centre, newest last; at most three are kept. */
export function Toaster() {
  const { t } = useTranslation();
  const items = useToastStore(state => state.items);
  const dismiss = useToastStore(state => state.dismiss);

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-5 z-[60] flex flex-col items-center gap-2"
    >
      {items.map(item => (
        <div
          key={item.id}
          data-testid="toast"
          className="pointer-events-auto flex max-w-[min(560px,calc(100vw-32px))] items-center gap-3 rounded-island bg-primary py-2 pl-4 pr-2 text-ui text-primary-foreground shadow-dialog motion-safe:animate-[toast-in_160ms_var(--ease-soft)]"
        >
          <span className={cn("size-2 shrink-0 rounded-full", DOT[item.tone])} aria-hidden="true" />
          <span className="min-w-0 flex-1">
            {item.lead && <span className="opacity-70">{item.lead}: </span>}
            {item.message}
          </span>
          {item.actions.map(action => (
            <button
              key={action.label}
              type="button"
              onClick={() => {
                dismiss(item.id);
                action.onClick();
              }}
              className="rounded-control px-2 py-1 font-semibold underline-offset-2 hover:underline"
            >
              {action.label}
            </button>
          ))}
          <button
            type="button"
            aria-label={t("actions.dismiss")}
            onClick={() => dismiss(item.id)}
            className="grid size-7 place-items-center rounded-control opacity-70 hover:opacity-100"
          >
            <Icon name="close" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
