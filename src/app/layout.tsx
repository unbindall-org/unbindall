import type { Metadata } from "next";
import "./globals.css";
import { Geist, Geist_Mono } from "next/font/google";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppI18nProvider } from "@/i18n/provider";
import { getServerLocale } from "@/i18n/server";
import { APIProvider } from "@/trpc/client";
import { siteName, siteUrl } from "@/features/legal/site";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getServerLocale();
  return {
    metadataBase: new URL(siteUrl),
    applicationName: siteName,
    title: "Unbindall – CS2 Config Generator",
    description: locale === "de"
      ? "Erstelle, teste und speichere deine Counter-Strike 2 Autoexec."
      : "Create, test, and save your Counter-Strike 2 autoexec.",
    openGraph: {
      type: "website",
      siteName,
      title: "Unbindall – CS2 Config Generator",
      description: locale === "de"
        ? "Erstelle, teste und speichere deine Counter-Strike 2 Autoexec."
        : "Create, test, and save your Counter-Strike 2 autoexec.",
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale = await getServerLocale();
  return (
    <html lang={locale} className={cn("font-sans", geist.variable, geistMono.variable)} suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AppI18nProvider initialLocale={locale}>
            <APIProvider>
              <TooltipProvider>{children}</TooltipProvider>
              <Toaster position="bottom-center" richColors />
            </APIProvider>
          </AppI18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
