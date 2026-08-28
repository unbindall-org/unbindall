"use client";

import { Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useTranslation } from "react-i18next";
import { DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <DropdownMenuCheckboxItem
      checked={theme === "light"}
      onCheckedChange={(checked) => setTheme(checked ? "light" : "dark")}
    >
      <Sun />
      {t("Light Mode")}
    </DropdownMenuCheckboxItem>
  );
}
