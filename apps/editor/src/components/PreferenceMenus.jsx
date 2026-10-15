import { useTranslation } from "react-i18next";

import { LANGUAGES } from "@/config/app";
import { THEMES, useTheme } from "@/stores/theme";

import { languageItems, themeItems } from "./preferences";
import { Button, IconButton } from "./ui/Button";
import { Icon } from "./ui/Icon";
import { Menu } from "./ui/Menu";

const THEME_ICONS = { system: "monitor", light: "sun", dark: "moon" };

/** Interface language: shows the current one's code, lists all by their own names. */
export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const current = i18n.resolvedLanguage ?? LANGUAGES[0];
  return (
    <Menu
      label={t("language.label")}
      sections={[{ title: t("language.label"), items: languageItems({ t, current }) }]}
      trigger={props => (
        <Button variant="ghost" size="sm" aria-label={t("language.label")} {...props}>
          <Icon name="globe" size={14} />
          <span className="font-mono text-label uppercase">{current}</span>
        </Button>
      )}
    />
  );
}

/** Theme: system, light or dark. */
export function ThemeMenu() {
  const { t } = useTranslation();
  const theme = useTheme(state => state.theme);
  const setTheme = useTheme(state => state.setTheme);
  return (
    <Menu
      label={t("theme.label")}
      sections={[{ title: t("theme.label"), items: themeItems({ t, theme, setTheme, themes: THEMES }) }]}
      trigger={props => (
        <IconButton label={t("theme.label")} {...props}>
          <Icon name={THEME_ICONS[theme]} />
        </IconButton>
      )}
    />
  );
}
