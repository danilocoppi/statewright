import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";

import { connection } from "./connection";
import { usePairing } from "./pairing";

/**
 * While this tab is paired, the actions island says with whom — "● <agent>", the run's accent dot — and offers
 * Disconnect (AI interface spec §7.4). Esc does not disconnect.
 * @param {{ pairing?: ReturnType<typeof import("./pairing").createPairing> }} props
 */
export function PairedBadge({ pairing = connection }) {
  const { t } = useTranslation("agent");
  const connected = usePairing(pairing, state => state.status === "connected");
  const agent = usePairing(pairing, state => state.agent) ?? t("change.anAgent");
  if (!connected) return null;
  return (
    <>
      <span
        data-testid="actions-agent"
        title={t("pairing.pairedWith", { agent })}
        className="flex min-w-0 max-w-40 items-center gap-2 pl-1.5 text-ui font-medium text-ink"
      >
        <span
          aria-hidden="true"
          className="size-2 shrink-0 rounded-full bg-accent shadow-[0_0_0_3px_var(--accent-soft)]"
        />
        <span className="sr-only">{t("pairing.pairedWith", { agent })}</span>
        <span aria-hidden="true" className="truncate">
          {agent}
        </span>
      </span>
      <Button size="sm" variant="ghost" data-testid="actions-disconnect" onClick={() => pairing.disconnect()}>
        {t("pairing.disconnect")}
      </Button>
      <span aria-hidden="true" className="mx-0.5 h-4 border-l border-hairline" />
    </>
  );
}
