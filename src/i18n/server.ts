import "server-only";

import { cookies, headers } from "next/headers";
import { isAppLocale, type AppLocale } from "./resources";

const localeCookieName = "unbindall-locale";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  const accepted = (await headers()).get("accept-language")?.toLowerCase() ?? "";
  const preferred = accepted
    .split(",")
    .map((entry, index) => {
      const [tag, ...parameters] = entry.trim().split(";");
      const quality = Number(parameters.find((item) => item.trim().startsWith("q="))?.split("=")[1] ?? 1);
      return { locale: tag.split("-")[0], quality: Number.isFinite(quality) ? quality : 0, index };
    })
    .filter((entry) => isAppLocale(entry.locale))
    .sort((left, right) => right.quality - left.quality || left.index - right.index)[0]?.locale;

  return isAppLocale(preferred) ? preferred : "de";
}
