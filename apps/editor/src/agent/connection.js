// This tab's pairing with an agent (AI interface spec §7.4): its calls run on window.statewright, and the person is
// told when the agent, the server or another tab ends it.
import i18n from "i18next";

import { toast } from "@/stores/toast";

import { createPairing } from "./pairing";

/** Tell the person why the pairing ended, unless they ended it. */
export function sayEnded(reason, agent) {
  if (reason === "person") return;
  toast.info(i18n.t(`agent:pairing.ended.${reason}`, { agent: agent ?? i18n.t("agent:change.anAgent") }));
}

export const connection = createPairing({ onEnd: sayEnded });
