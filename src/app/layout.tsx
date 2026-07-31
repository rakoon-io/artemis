import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { LocaleProvider } from "@/i18n/provider";
import { getDictionary, getLocale } from "@/i18n/server";

export const metadata: Metadata = {
  title: "Artemis",
  description:
    "Suivi de tickets sobre, moderne et personnalisable pour une méthode agile.",
  /**
   * Réglages propres à iOS, que le manifeste ne couvre pas.
   *
   * Safari lit `display: standalone` depuis iOS 15.4 - le mode plein écran ne
   * dépend donc plus d'une balise Apple. En revanche, le NOM posé sous l'icône
   * de l'écran d'accueil et le style de la barre d'état n'ont pas d'équivalent
   * dans le manifeste : ils viennent d'ici.
   *
   * Vérifié dans le HTML produit : Next émet `mobile-web-app-capable`, le nom
   * normalisé, et non l'ancien `apple-mobile-web-app-capable` que Chrome signale
   * comme obsolète. Les iOS antérieurs à 15.4 n'auront donc qu'un marque-page.
   */
  appleWebApp: {
    capable: true,
    title: "Artemis",
    // `default` laisse la barre d'état lisible sur fond clair comme sur fond
    // sombre ; `black-translucent` la ferait passer SOUS le contenu, et la
    // barre du haut viendrait s'y encastrer.
    statusBarStyle: "default",
  },
};

/**
 * Couleur du décor système autour de la fenêtre installée.
 *
 * Déclarée pour les deux thèmes : une seule valeur donnerait un bandeau clair
 * au-dessus d'une application sombre, ou l'inverse. Le navigateur choisit selon
 * le réglage de la machine - ce que le manifeste, lui, ne sait pas faire.
 */
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fdfdfd" },
    { media: "(prefers-color-scheme: dark)", color: "#141418" },
  ],
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
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
