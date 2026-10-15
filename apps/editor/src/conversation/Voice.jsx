import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { APP } from "@/config/app";
import { cn } from "@/lib/cn";

import { conversationStore } from "./store";

/** Where the person's consent to dictation is remembered (a setting, not the conversation). */
const CONSENT = `${APP.storagePrefix}:voice`;
/** The recognition's languages for the interface's. */
const LANGUAGES = { en: "en-US", "pt-BR": "pt-BR", es: "es-ES" };

const recognitionOf = () => globalThis.SpeechRecognition ?? globalThis.webkitSpeechRecognition ?? null;

const consented = () => {
  try {
    return globalThis.localStorage?.getItem(CONSENT) === "allowed";
  } catch {
    return false;
  }
};

/**
 * Dictation into the conversation's field (collaboration spec §9): the browser's speech recognition, in the
 * interface's language. The first use asks for consent, saying where the voice goes; what is said is written after
 * what the field held — words still being heard replaced as they settle — and nothing is recorded or kept. Not shown
 * where the browser cannot listen.
 */
export function Voice() {
  const { t, i18n } = useTranslation("agent");
  const [asking, setAsking] = useState(false);
  const [listening, setListening] = useState(false);
  const [refused, setRefused] = useState(false);
  const recognition = useRef(null);
  const Recognition = recognitionOf();

  useEffect(() => () => recognition.current?.stop?.(), []);
  if (!Recognition) return null;

  const listen = () => {
    setRefused(false);
    const heard = new Recognition();
    heard.lang = LANGUAGES[i18n.language] ?? i18n.language;
    heard.interimResults = true;
    heard.continuous = true;
    const before = conversationStore.getState().draft;
    const lead = before && !/\s$/.test(before) ? `${before} ` : before;
    heard.onresult = event => {
      const said = [...event.results].map(result => result[0].transcript).join("");
      conversationStore.getState().setDraft(`${lead}${said}`.replace(/\s+/g, " "));
    };
    heard.onerror = event => {
      if (event.error === "not-allowed" || event.error === "service-not-allowed") setRefused(true);
      setListening(false);
    };
    heard.onend = () => setListening(false);
    recognition.current = heard;
    heard.start();
    setListening(true);
  };

  return (
    <span className="relative flex">
      <button
        type="button"
        data-testid="conversation-voice"
        aria-pressed={listening}
        aria-label={listening ? t("voice.stop") : t("voice.dictate")}
        title={listening ? t("voice.stop") : t("voice.dictate")}
        onClick={() => {
          if (listening) return recognition.current?.stop();
          if (!consented()) return setAsking(true);
          listen();
        }}
        className={cn(
          "grid size-8 place-items-center rounded-control text-sub hover:bg-subtle hover:text-ink",
          listening && "bg-danger-soft text-danger motion-safe:animate-pulse"
        )}
      >
        <Icon name="mic" />
      </button>
      {asking && (
        <div
          role="dialog"
          aria-label={t("voice.dictate")}
          className="absolute bottom-10 right-0 z-10 grid w-72 gap-2 rounded-island border border-island-border bg-surface p-3 text-ink shadow-dialog"
        >
          <p className="text-read">{t("voice.consent")}</p>
          <div className="flex justify-end gap-1.5">
            <Button size="sm" variant="ghost" onClick={() => setAsking(false)}>
              {t("voice.cancel")}
            </Button>
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                try {
                  globalThis.localStorage?.setItem(CONSENT, "allowed");
                } catch {
                  // A browser that keeps nothing asks again next time.
                }
                setAsking(false);
                listen();
              }}
            >
              {t("voice.allow")}
            </Button>
          </div>
        </div>
      )}
      {refused && (
        <p
          role="status"
          className="absolute bottom-10 right-0 w-64 rounded-control bg-surface p-2 text-label text-danger shadow-island"
        >
          {t("voice.refused")}
        </p>
      )}
    </span>
  );
}
