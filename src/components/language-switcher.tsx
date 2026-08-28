"use client";

import { Check, Globe2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { setAppLocale } from "@/i18n/provider";
import { isAppLocale, supportedLocales, type AppLocale } from "@/i18n/resources";

const localeNames: Record<AppLocale, string> = { de: "Deutsch", en: "English" };

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const locale = isAppLocale(i18n.resolvedLanguage) ? i18n.resolvedLanguage : "de";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="language-button" aria-label={t("Sprache auswählen")}>
          <Globe2 size={15} /><span>{locale.toUpperCase()}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLocales.map((item) => (
          <DropdownMenuItem key={item} onClick={() => void setAppLocale(i18n, item)}>
            <span>{item === "de" ? t(localeNames[item]) : localeNames[item]}</span>
            {locale === item && <Check size={14} />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
