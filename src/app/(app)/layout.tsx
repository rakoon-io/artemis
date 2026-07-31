import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { BuildStamp } from "@/components/brand/build-stamp";
import { GithubLink } from "@/components/brand/github-link";
import { InstanceBadge } from "@/components/brand/instance-badge";
import { TrackerMark } from "@/components/brand/tracker-mark";
import { ThemePicker } from "@/components/theme-picker";
import { UserMenu } from "@/components/user-menu";
import { env } from "@/lib/env";

/** Shell global de l'espace connecté : barre du haut + conteneur principal. */
export default async function AppLayout({
  children,
  projectbar,
}: {
  children: ReactNode;
  /**
   * Créneau parallèle : ce qu'une route profonde souhaite voir figurer dans la
   * barre du haut. Vide partout, sauf sur les pages d'un projet, où il porte
   * son nom et ses onglets (voir `@projectbar/`).
   *
   * La coque n'a rien à savoir de ce contenu : elle lui réserve une place, et
   * c'est la route qui le remplit - ou non.
   */
  projectbar: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = {
    name: session.user.name ?? null,
    email: session.user.email ?? "",
    role: session.user.role,
  };
  const isDemo = env.DEMO_MODE === "true";
  const aiBudget = env.AI_DAILY_BUDGET_USD;

  return (
    /**
     * La coque occupe AU MOINS l'écran, et EXACTEMENT l'écran dès qu'une page
     * demande à le remplir (`data-fill-viewport`, posé par le tableau Kanban).
     *
     * Sans hauteur définie, un `flex-1` plus bas ne distribue rien : il n'y a
     * pas d'espace restant à partager tant que la racine se dimensionne sur son
     * contenu. C'est pourquoi le tableau calculait sa hauteur en dur - et se
     * trompait de 49 pixels, le pied de page n'étant pas compté.
     *
     * `:has()` plutôt qu'un drapeau remonté par contexte : la décision appartient
     * à la page, la coque n'a pas à la connaître, et rien ne transite par du JS.
     */
    <div className="flex min-h-screen flex-col has-[[data-fill-viewport]]:h-dvh has-[[data-fill-viewport]]:overflow-hidden">
      {isDemo && (
        <div className="border-b bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          Environnement de démonstration — les données sont réinitialisées
          régulièrement au jeu de base.
          {aiBudget && ` Génération IA plafonnée à ${aiBudget} $/jour.`}
        </div>
      )}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        {/**
         * UNE SEULE BANDE, plutôt que trois empilées.
         *
         * Le nom du projet et ses onglets vivaient sous l'en-tête, dans deux
         * blocs successifs : 172 pixels de décor avant la première ligne utile,
         * sur un écran qui n'en offre pas mille. Ils tiennent désormais sur la
         * même ligne que la marque, à droite de celle-ci.
         *
         * `min-h-14` et non `h-14` : sous `md`, la barre de projet passe à la
         * ligne (voir le créneau) et l'en-tête doit pouvoir grandir. Le
         * remplissage haut n'existe que là - sur une ligne unique, `min-h-14`
         * centre déjà tout.
         */}
        <div className="flex min-h-14 w-full flex-wrap items-center gap-x-4 px-4 pt-2 md:px-6 md:pt-0">
          <Link
            href="/projects"
            className="flex shrink-0 items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <TrackerMark className="size-7 shrink-0 text-primary" />
            <span>Artemis</span>
          </Link>
          <InstanceBadge />
          {projectbar}
          {/* Basis nulle : cet écarteur absorbe l'espace LIBRE sans jamais
              disputer le sien à la barre de projet, qui peut donc réclamer la
              largeur de ses onglets. */}
          <div className="flex-1" />
          <ThemePicker />
          <UserMenu user={user} />
        </div>
      </header>
      {/* `flex flex-col` : une page qui veut occuper la hauteur restante - le
          tableau Kanban - n'a plus à deviner celle du bandeau ni du pied de page.
          Elle se déclare `flex-1`, et ce qui reste lui revient. */}
      <main className="flex w-full min-h-0 flex-1 flex-col">{children}</main>
      {/* `flex-wrap` : la signature, le dépôt et l'identité du build tiennent sur
          une ligne au large, et se replient proprement sur un téléphone. */}
      <footer className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 border-t py-4 text-center text-xs text-muted-foreground">
        <span>Développé par Thomas Broussard</span>
        {isDemo && (
          <>
            {/* Idem : séparateur et lien vont de pair. */}
            <span aria-hidden>·</span>
            <GithubLink />
          </>
        )}
        <BuildStamp />
      </footer>
    </div>
  );
}
