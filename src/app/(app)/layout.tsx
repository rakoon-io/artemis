import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { GithubLink } from "@/components/brand/github-link";
import { TrackerMark } from "@/components/brand/tracker-mark";
import { ThemePicker } from "@/components/theme-picker";
import { UserMenu } from "@/components/user-menu";
import { env } from "@/lib/env";

/** Shell global de l'espace connecté : barre du haut + conteneur principal. */
export default async function AppLayout({
  children,
}: {
  children: ReactNode;
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
        <div className="flex h-14 w-full items-center gap-4 px-4 md:px-6">
          <Link
            href="/projects"
            className="flex items-center gap-2 font-semibold transition-opacity hover:opacity-80"
          >
            <TrackerMark className="size-7 shrink-0 text-primary" />
            <span>Artemis</span>
          </Link>
          <div className="flex-1" />
          <ThemePicker />
          <UserMenu user={user} />
        </div>
      </header>
      {/* `flex flex-col` : une page qui veut occuper la hauteur restante - le
          tableau Kanban - n'a plus à deviner celle du bandeau ni du pied de page.
          Elle se déclare `flex-1`, et ce qui reste lui revient. */}
      <main className="flex w-full min-h-0 flex-1 flex-col">{children}</main>
      <footer className="flex items-center justify-center gap-2 border-t py-4 text-center text-xs text-muted-foreground">
        <span>Développé par Thomas Broussard</span>
        {isDemo && (
          <>
            {/* Idem : séparateur et lien vont de pair. */}
            <span aria-hidden>·</span>
            <GithubLink />
          </>
        )}
      </footer>
    </div>
  );
}
