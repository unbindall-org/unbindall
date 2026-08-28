"use client";

import { useEffect, useState } from "react";
import { createInstance } from "i18next";
import { I18nextProvider, initReactI18next } from "react-i18next";
import { isAppLocale, resources, type AppLocale } from "./resources";

const storageKey = "unbindall:locale";
const cookieName = "unbindall-locale";

export function AppI18nProvider({ initialLocale, children }: { initialLocale: AppLocale; children: React.ReactNode }) {
  const [instance] = useState(() => {
    const next = createInstance();
    void next.use(initReactI18next).init({
      resources,
      lng: initialLocale,
      fallbackLng: "de",
      supportedLngs: ["de", "en"],
      keySeparator: false,
      interpolation: { escapeValue: false },
      initAsync: false,
    });
    return next;
  });

  useEffect(() => {
    const stored = window.localStorage.getItem(storageKey);
    const locale = isAppLocale(stored) ? stored : initialLocale;
    if (instance.language !== locale) void instance.changeLanguage(locale);
    document.documentElement.lang = locale;
    document.cookie = `${cookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  }, [initialLocale, instance]);

  return <I18nextProvider i18n={instance}>{children}</I18nextProvider>;
}

export async function setAppLocale(instance: { changeLanguage: (locale: string) => Promise<unknown> }, locale: AppLocale) {
  window.localStorage.setItem(storageKey, locale);
  document.cookie = `${cookieName}=${locale}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.documentElement.lang = locale;
  await instance.changeLanguage(locale);
}

export const localeCookieName = cookieName;
