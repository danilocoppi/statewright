import { useEffect, useEffectEvent, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { TextField } from "@/components/ui/TextField";
import { cn } from "@/lib/cn";

import { connection } from "./connection";
import { usePairing } from "./pairing";

/** How long "Connected to <agent>" stays before the dialog gives the page back to the agent's calls. */
export const CONNECTED_MS = 1500;

const FAILED = new Set(["invalid", "unreachable", "refused", "expired"]);

/** The status's dot: the run's accent while waiting or connected, the danger colour when it failed. */
function Dot({ tone }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "size-2 shrink-0 rounded-full",
        tone === "danger" ? "bg-danger" : "bg-accent shadow-[0_0_0_3px_var(--accent-soft)]",
        tone === "waiting" && "motion-safe:animate-[sw-breathe_1.6s_var(--ease-soft)_infinite]"
      )}
    />
  );
}

/**
 * Connect an AI… (AI interface spec §7.4): the code an agent pairs with, the address of the server it runs, what
 * pairing allows and the browser's question about the local network; then waiting, then connected. Mount it only
 * while open: opening shows a new code, and closing it before an agent comes withdraws the code.
 * @param {{ onClose: () => void, pairing?: ReturnType<typeof import("./pairing").createPairing> }} props
 */
export function ConnectDialog({ onClose, pairing = connection }) {
  const { t } = useTranslation(["agent", "common"]);
  const status = usePairing(pairing, state => state.status);
  const code = usePairing(pairing, state => state.code);
  const address = usePairing(pairing, state => state.address);
  const agent = usePairing(pairing, state => state.agent) ?? t("change.anAgent");
  const [typed, setTyped] = useState(address);
  const [copied, setCopied] = useState(false);
  const was = useRef(status);
  const closeNow = useEffectEvent(() => onClose());

  // Opening shows a code and waits for an agent, unless this tab is paired already.
  useEffect(() => {
    if (pairing.store.getState().status === "off") pairing.begin();
  }, [pairing]);

  // Once an agent connects, the dialog says so, then closes. A pairing that ends while it is open shows a new code.
  useEffect(() => {
    const before = was.current;
    was.current = status;
    if (status === "off" && before === "connected") {
      pairing.begin();
      return;
    }
    if (status !== "connected" || before !== "waiting") return;
    const timer = setTimeout(closeNow, CONNECTED_MS);
    return () => clearTimeout(timer);
  }, [status, pairing]);

  const close = () => {
    if (pairing.store.getState().status !== "connected") pairing.cancel();
    onClose();
  };
  const again = () => {
    setCopied(false);
    pairing.begin(typed);
  };
  const copy = () => {
    globalThis.navigator?.clipboard
      ?.writeText(t("pairing.copyText", { code }))
      .then(() => setCopied(true))
      .catch(() => {});
  };
  const connected = status === "connected";
  const failed = FAILED.has(status);
  const said = {
    waiting: t("pairing.waiting"),
    connected: t("pairing.connected", { agent }),
    invalid: t("pairing.invalid", { address }),
    unreachable: t("pairing.unreachable", { address }),
    refused: t("pairing.refused", { address }),
    expired: t("pairing.expired")
  }[status];
  const hint = {
    waiting: t("pairing.valid"),
    invalid: t("pairing.invalidHint"),
    unreachable: t("pairing.unreachableHint"),
    refused: t("pairing.refusedHint", { origin: globalThis.location?.origin ?? "" })
  }[status];

  return (
    <Dialog
      open
      onClose={close}
      testId="connect-dialog"
      className="w-[min(480px,calc(100vw-32px))]"
      title={t("pairing.title")}
      description={connected ? undefined : t("pairing.description")}
      actions={
        connected ?
          <>
            <Button
              variant="danger"
              onClick={() => {
                pairing.disconnect();
                onClose();
              }}
            >
              {t("pairing.disconnect")}
            </Button>
            <Button variant="primary" onClick={onClose}>
              {t("pairing.done")}
            </Button>
          </>
        : <>
            <Button onClick={close}>{t("common:actions.cancel")}</Button>
            {failed && (
              <Button variant="primary" onClick={again}>
                {status === "expired" ? t("pairing.newCode") : t("pairing.tryAgain")}
              </Button>
            )}
          </>
      }
    >
      {/* The code sits on a piece of the canvas the agent is about to work on. */}
      <div className="rounded-[10px] border border-hairline bg-dots px-4 pb-3.5 pt-4">
        {!connected && (
          <div className="flex items-center justify-between gap-3">
            <output
              data-testid="connect-code"
              aria-label={t("pairing.code")}
              className={cn(
                "font-mono text-[28px] font-medium leading-none tracking-[0.14em] tabular-nums",
                status === "waiting" ? "text-ink" : "text-muted line-through decoration-1"
              )}
            >
              {code}
            </output>
            {status === "waiting" && (
              <Button size="sm" onClick={copy}>
                {copied ? t("pairing.copied") : t("pairing.copy")}
              </Button>
            )}
          </div>
        )}
        <p
          data-testid="connect-status"
          role="status"
          className={cn(
            "flex items-center gap-2 text-ui font-medium",
            !connected && "mt-3.5",
            connected ? "text-accent"
            : failed ? "text-danger"
            : "text-ink"
          )}
        >
          <Dot tone={failed ? "danger" : status} />
          {said}
        </p>
        {hint && <p className="mt-1 pl-4 text-ui text-muted">{hint}</p>}
      </div>

      {!connected && (
        <form
          className="mt-4"
          onSubmit={event => {
            event.preventDefault();
            again();
          }}
        >
          <TextField label={t("pairing.address")} value={typed} onChange={setTyped} testId="connect-address" />
        </form>
      )}
      <div className="mt-4 grid gap-2 text-ui leading-relaxed text-sub">
        <p>{t("pairing.allows")}</p>
        {!connected && <p className="text-muted">{t("pairing.network")}</p>}
      </div>
    </Dialog>
  );
}
