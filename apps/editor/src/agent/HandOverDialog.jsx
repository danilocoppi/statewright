import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

import { connection } from "./connection";
import { usePairing } from "./pairing";

/**
 * Another tab asks to take this one's place with the agent (AI interface spec §6: "pairing another replaces it after
 * the person confirms in the first"). Esc, or the backdrop, keeps the agent here.
 * @param {{ pairing?: ReturnType<typeof import("./pairing").createPairing> }} props
 */
export function HandOverDialog({ pairing = connection }) {
  const { t } = useTranslation("agent");
  const handover = usePairing(pairing, state => state.handover);
  const agent = handover?.agent ?? t("change.anAgent");
  return (
    <Dialog
      open={Boolean(handover)}
      onClose={() => pairing.handOver(false)}
      testId="handover-dialog"
      className="w-[min(440px,calc(100vw-32px))]"
      title={t("pairing.handover.title")}
      description={t("pairing.handover.description", { agent })}
      actions={
        <>
          <Button onClick={() => pairing.handOver(false)}>{t("pairing.handover.keep")}</Button>
          <Button variant="primary" onClick={() => pairing.handOver(true)}>
            {t("pairing.handover.give")}
          </Button>
        </>
      }
    />
  );
}
