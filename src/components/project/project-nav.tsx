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
    { href: `${base}/wiki`, label: t.settings.nav.wiki },
    // Structure : ouverte à TOUT membre du projet (consultation + propositions),
    // contrairement à Paramètres qui reste réservé aux administrateurs.
    { href: `${base}/structure`, label: t.settings.nav.structure },
    ...(isAdmin
      ? [{ href: `${base}/settings`, label: t.settings.nav.settings }]
      : []),
  ];

  return (
    // Six onglets font 493 pixels : plus qu'un téléphone n'en offre. Sans
    // `overflow-x-auto`, c'est la PAGE ENTIÈRE qui se décalait vers la droite et
    // qu'il fallait faire glisser pour lire la moindre ligne. La barre défile
    // désormais pour elle seule - et non l'inverse.
    // `pb-px` : en CSS, dès qu'un axe de débordement vaut autre chose que
    // `visible`, l'autre bascule de `visible` à `auto`. Le `-mb-px` des onglets
    // - qui fait chevaucher leur soulignement sur la bordure de la barre - les
    // faisait dépasser d'un pixel, et ce pixel suffisait à faire naître un
    // ascenseur VERTICAL sur toute la hauteur de la fenêtre.
    //
    // Un pixel de remplissage bas ABSORBE ce dépassement, plutôt que de le
    // masquer par `overflow-y-hidden` : rien n'est rogné, le soulignement de
    // l'onglet actif garde ses deux pixels pleins.
    <nav
      className="flex items-center gap-1 overflow-x-auto border-b pb-px"
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
              "-mb-px shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium transition-colors",
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
