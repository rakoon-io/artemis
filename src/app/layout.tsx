import type { Metadata, Viewport } from "next";
import { getInstance } from "@/server/services/settings.service";
import "./globals.css";
import { Providers } from "@/components/providers";
import { RegisterServiceWorker } from "@/components/pwa/register-service-worker";
import { LocaleProvider } from "@/i18n/provider";
import { getDictionary, getLocale } from "@/i18n/server";

/**
 * MÉTADONNÉES ENGENDRÉES, parce qu'elles dépendent de l'instance.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA FAVICON AUSSI
 *
 * Un fichier `icon.svg` livré dans le dépôt donnait la même pastille violette à
 * la production et à la recette : dans une barre de quinze onglets, rien ne les
 * distinguait. Elle est désormais dessinée aux couleurs de l'instance, comme
 * l'icône installée, et porte le même jeton - c'est lui qui la fait reprendre
 * après un changement, là où un cache d'un an l'aurait figée.
 *
 * À seize pixels, l'étiquette est illisible et n'est donc pas peinte : c'est la
 * couleur qui distingue. Deux instances de même couleur ont la même favicon,
 * et il faut leur en donner de différentes.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE TITRE PORTE L'INSTANCE, VIA UN GABARIT
 *
 * Trois pages écrivaient « · Artemis » à la main, deux l'oubliaient : l'onglet
 * annonçait tantôt « Utilisateurs · Artemis », tantôt « Versions » tout court.
 * Un gabarit à la racine le pose une fois pour toutes, et y glisse le nom de
 * l'instance - « Versions · Artemis · Recette ». L'onglet dit alors où l'on est
 * ET sur quel déploiement, ce qu'aucune favicon ne peut faire tenir.
 */
export async function generateMetadata(): Promise<Metadata> {
  const instance = await getInstance();
  const v = instance.token;
  return {
    title: {
      default: instance.name,
      template: `%s · ${instance.name}`,
    },
    description:
      "Suivi de tickets sobre, moderne et personnalisable pour une méthode agile.",
    icons: {
      icon: [{ url: `/icons/32?v=${v}`, sizes: "32x32", type: "image/png" }],
      apple: [{ url: `/icons/180?v=${v}`, sizes: "180x180", type: "image/png" }],
    },
    /**
     * Réglages propres à iOS, que le manifeste ne couvre pas.
     *
     * Safari lit `display: standalone` depuis iOS 15.4 - le mode plein écran ne
     * dépend donc plus d'une balise Apple. En revanche, le NOM posé sous l'icône
     * de l'écran d'accueil et le style de la barre d'état n'ont pas d'équivalent
     * dans le manifeste : ils viennent d'ici.
     *
     * Vérifié dans le HTML produit : Next émet `mobile-web-app-capable`, le nom
     * normalisé, et non l'ancien `apple-mobile-web-app-capable` que Chrome
     * signale comme obsolète. Les iOS antérieurs à 15.4 n'auront qu'un
     * marque-page.
     */
    appleWebApp: {
      capable: true,
      title: instance.name,
      // `default` laisse la barre d'état lisible sur fond clair comme sur fond
      // sombre ; `black-translucent` la ferait passer SOUS le contenu, et la
      // barre du haut viendrait s'y encastrer.
      statusBarStyle: "default",
    },
  };
}

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
