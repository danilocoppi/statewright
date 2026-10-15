import { useTranslation } from "react-i18next";
import { Link } from "react-router";

import { SupportBadge } from "@/components/SupportBadge";

export default function NotFound() {
  const { t } = useTranslation();
  return (
    <main className="grid min-h-screen place-items-center bg-dots px-6">
      <div className="max-w-sm text-center">
        <h1 className="text-page font-semibold tracking-tight">{t("notFound.title")}</h1>
        <p className="mt-2 text-read text-sub">{t("notFound.description")}</p>
        <Link to="/" className="mt-5 inline-block font-medium text-accent hover:underline">
          {t("actions.goHome")}
        </Link>
      </div>
      <SupportBadge />
    </main>
  );
}
