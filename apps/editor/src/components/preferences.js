// Menu items for the interface preferences, shared by the Projects screen and the project menu.
import { LANGUAGES } from "@/config/app";
import { setLanguage } from "@/i18n/language";

/** Choices of theme, as menu items. */
export const themeItems = ({ t, theme, setTheme, themes }) =>
  themes.map(option => ({
    id: `theme-${option}`,
    label: t(`common:theme.${option}`),
    checked: option === theme,
    onSelect: () => setTheme(option)
  }));

/** Choices of interface language, as menu items (each named in its own language). */
export const languageItems = ({ t, current }) =>
  LANGUAGES.map(language => ({
    id: `language-${language}`,
    label: t(`common:language.${language}`),
    checked: language === current,
    onSelect: () => setLanguage(language)
  }));
