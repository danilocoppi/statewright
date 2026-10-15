// Root error boundary: an unexpected error in a page, or a page chunk that failed to load, ends here instead of a
// blank screen. When a project is open, its document is offered as a download, so no work is lost (spec §10).
import { useTranslation } from "react-i18next";
import { useRouteError } from "react-router";

import { Button } from "@/components/ui/Button";
import { downloadDocumentCopy } from "@/features/editor/download-copy";
import { editorStore } from "@/store/editor";

export function ErrorPage() {
  const { t } = useTranslation(["common", "editor"]);
  const error = useRouteError();
  if (import.meta.env.DEV) console.error(error);
  const hasDocument = Boolean(editorStore.getState().doc);
  return (
    <main className="grid min-h-screen place-items-center bg-dots px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-page font-semibold tracking-tight">{t("errorPage.title")}</h1>
        <p className="mt-2 text-read text-sub">{t("errorPage.description")}</p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {hasDocument && <Button onClick={() => downloadDocumentCopy()}>{t("editor:panel.download")}</Button>}
          <Button variant="primary" onClick={() => window.location.reload()}>
            {t("actions.reload")}
          </Button>
        </div>
      </div>
    </main>
  );
}
