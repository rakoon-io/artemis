import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { LocaleProvider } from "@/i18n/provider";
import { getDictionary, getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Artemis",
  description:
    "Suivi de tickets sobre, moderne et personnalisable pour une méthode agile.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [locale, dict] = await Promise.all([getLocale(), getDictionary()]);

  return (
    <html lang={locale} suppressHydrationWarning className="h-full">
      <body className="min-h-full bg-background font-sans text-foreground antialiased">
        <Providers>
          <LocaleProvider dict={dict} locale={locale}>
            {children}
          </LocaleProvider>
        </Providers>
      </body>
    </html>
  );
}
