import { Component } from "react";
import { useTranslation } from "react-i18next";

import { downloadDocumentCopy } from "@/features/editor/download-copy";
import { cn } from "@/lib/cn";

import { Button } from "./ui/Button";

class Boundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidUpdate(previous) {
    // Something else to show (another selection): start afresh.
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  componentDidCatch(error) {
    if (import.meta.env.DEV) console.error(error);
  }

  render() {
    return this.state.error ? this.props.fallback(() => this.setState({ error: null })) : this.props.children;
  }
}

/**
 * Keeps a failure inside one area of the screen (spec §10): the area shows what happened, can be reloaded, and offers
 * a copy of the document. The document in the store survives. When `resetKey` changes (another selection), a failed
 * area starts afresh.
 */
export function PanelBoundary({ className, style, resetKey, children }) {
  const { t } = useTranslation("editor");
  return (
    <Boundary
      resetKey={resetKey}
      fallback={reset => (
        <div role="alert" style={style} className={cn("grid place-items-center p-6", className)}>
          <div className="grid max-w-sm justify-items-center gap-3 text-center">
            <p className="text-read text-sub">{t("panel.failed")}</p>
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={reset}>{t("panel.reload")}</Button>
              <Button onClick={() => downloadDocumentCopy()}>{t("panel.download")}</Button>
            </div>
          </div>
        </div>
      )}
    >
      {children}
    </Boundary>
  );
}
