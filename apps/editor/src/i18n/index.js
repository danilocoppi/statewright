// i18n — one JSON file per namespace and language: locales/<language>/<namespace>.json.
//
//   common    texts of the whole app (actions, theme, language, errors of the app shell)
//   projects  the Projects screen
//   files     import, save and export
//   editor    the editor shell
//   inspector the inspector, the catalog sheet and the command palette
//   simulate  the simulation: Simulate, its panel and the marks on the canvas
//   agent     what AI agents do in the Editor: their changes, what they point to
//
// Only the language in use is downloaded: each JSON file becomes its own chunk (import.meta.glob).
// The first visit follows the browser's languages (spec §8.3); a choice made in the app is remembered.
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import { I18N_NAMESPACES, LANGUAGES } from "@/config/app";

import { rememberedLanguage, resolveLanguage } from "./language";

const loaders = import.meta.glob("./locales/*/*.json");

i18n
  .use(initReactI18next)
  .use({
    type: "backend",
    read(language, namespace, callback) {
      const load = loaders[`./locales/${language}/${namespace}.json`];
      if (!load) return callback(new Error(`i18n: locales/${language}/${namespace}.json does not exist`));
      load().then(module => callback(null, module.default), callback);
    }
  })
  .init({
    lng: rememberedLanguage() ?? resolveLanguage(navigator.languages),
    supportedLngs: LANGUAGES,
    fallbackLng: LANGUAGES[0],
    ns: I18N_NAMESPACES,
    defaultNS: "common",
    load: "currentOnly",
    interpolation: { escapeValue: false },
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (_languages, namespace, key) => console.error(`i18n: missing key "${namespace}:${key}"`)
  });

i18n.on("languageChanged", language => document.documentElement.setAttribute("lang", language));

export default i18n;
