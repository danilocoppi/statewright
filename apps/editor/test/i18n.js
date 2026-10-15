// English translations for component tests, loaded synchronously (the app loads them on demand).
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import agent from "@/i18n/locales/en/agent.json";
import common from "@/i18n/locales/en/common.json";
import editor from "@/i18n/locales/en/editor.json";
import files from "@/i18n/locales/en/files.json";
import inspector from "@/i18n/locales/en/inspector.json";
import projects from "@/i18n/locales/en/projects.json";
import simulate from "@/i18n/locales/en/simulate.json";

await i18n.use(initReactI18next).init({
  lng: "en",
  resources: { en: { common, editor, files, inspector, projects, simulate, agent } },
  ns: ["common", "projects", "files", "editor", "inspector", "simulate", "agent"],
  defaultNS: "common",
  interpolation: { escapeValue: false }
});

export default i18n;
