"use client";

import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { Switch } from "@/components/ui/switch";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <Switch
      checked={theme === "light"}
      onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
      aria-label={t("Light Mode")}
    />
  );
}
