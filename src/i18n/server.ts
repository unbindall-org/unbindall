import "server-only";

import { cookies } from "next/headers";
import { isAppLocale, type AppLocale } from "./resources";

const localeCookieName = "unbindall-locale";

export async function getServerLocale(): Promise<AppLocale> {
  const cookieLocale = (await cookies()).get(localeCookieName)?.value;
  if (isAppLocale(cookieLocale)) return cookieLocale;

  return "en";
}
