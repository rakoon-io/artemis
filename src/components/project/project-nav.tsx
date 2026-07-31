"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useDict } from "@/i18n/provider";
import { cn } from "@/lib/utils";

export interface ProjectNavProps {
  projectKey: string;
  isAdmin: boolean;
}

/** Onglets de navigation d'un projet (l'actif est déduit de l'URL courante). */
export function ProjectNav({ projectKey, isAdmin }: ProjectNavProps) {
  const pathname = usePathname();
  const t = useDict();
  const base = `/projects/${projectKey}`;

  const tabs = [
    { href: `${base}/board`, label: t.settings.nav.board },
    { href: `${base}/tickets`, label: t.settings.nav.tickets },
    { href: `${base}/sprints`, label: t.settings.nav.sprints },
    { href: `${base}/versions`, label: t.settings.nav.versions },
    { href: `${base}/wiki`, label: t.settings.nav.wiki },
    // Structure : ouverte à TOUT membre du projet (consultation + propositions),
    // contrairement à Paramètres qui reste réservé aux administrateurs.
    { href: `${base}/structure`, label: t.settings.nav.structure },
    ...(isAdmin
      ? [{ href: `${base}/settings`, label: t.settings.nav.settings }]
      : []),
  ];

  return (
    // Sept onglets font 560 pixels : plus qu'un téléphone n'en offre. Sans
    // `overflow-x-auto`, c'est la PAGE ENTIÈRE qui se décalait vers la droite et
    // qu'il fallait faire glisser pour lire la moindre ligne. La barre défile
    // désormais pour elle seule - et non l'inverse. `min-w-0` le rend possible :
    // un élément flexible refuse par défaut de passer sous sa taille minimale de
    // contenu, et ne déborderait donc jamais... vers l'intérieur.
    //
    // Pas de `flex-1` ici, à dessein : une base nulle ne compte pour RIEN dans
    // la largeur naturelle du parent, qui cesserait alors de réclamer la place
    // de ses onglets - ils seraient comprimés là même où l'écran est large.
    //
    // L'ascenseur horizontal est masqué : il se poserait sur le soulignement de
    // l'onglet actif, à un pixel de la bordure de l'en-tête. Le glissement et la
    // molette horizontale, eux, restent entiers.
    //
    // Plus de bordure basse propre : c'est celle de l'en-tête qui sert de ligne
    // aux onglets, lesquels s'étirent sur toute sa hauteur pour la rejoindre.
    <nav
      className="flex min-w-0 items-stretch gap-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      aria-label={t.settings.nav.ariaLabel}
    >
      {tabs.map((tab) => {
        const isActive =
          pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors",
              isActive
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
