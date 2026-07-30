import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDate } from "@/lib/utils";
import { freshnessOf, type Freshness } from "@/lib/wiki-freshness";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * LE SENS DE LECTURE INVERSE : depuis une brique du système, ce qui en est écrit.
 *
 * C'est ce qui transforme les liens page → module en quelque chose d'utile. Sans
 * lui, déclarer qu'une page documente le module « Facturation » n'aurait servi
 * qu'à orner cette page ; avec lui, on ouvre un ticket sur la facturation et la
 * documentation est là, sans l'avoir cherchée.
 *
 * La FRAÎCHEUR est reprise ici, et c'est même l'endroit où elle compte le plus :
 * on s'apprête à travailler en s'appuyant sur ce texte. Savoir qu'il n'a pas été
 * vérifié depuis deux ans change la façon de le lire.
 *
 * Composant SERVEUR : il ne fait que rendre des liens, et n'a aucune raison de
 * partir dans le paquet du navigateur.
 */
const FRESHNESS_STYLE: Record<Freshness, string> = {
  fresh: "border-transparent bg-secondary text-secondary-foreground",
  ageing: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  stale:
    "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300",
};

export interface DocumentingPage {
  id: string;
  title: string;
  slug: string | null;
  updatedAt: Date;
  reviewedAt: Date | null;
}

export async function DocumentingPages({
  pages,
  projectKey,
  emptyHint = false,
}: {
  pages: DocumentingPage[];
  projectKey: string;
  /** Afficher une phrase quand il n'y a rien, plutôt que de ne rien rendre. */
  emptyHint?: boolean;
}) {
  const t = await getDictionary();

  if (pages.length === 0) {
    // Par défaut on ne rend RIEN : sur un ticket, une ligne « aucune
    // documentation » sur chaque écran serait un reproche permanent plutôt
    // qu'un renseignement.
    if (!emptyHint) return null;
    return (
      <p className="text-sm text-muted-foreground">
        {t.wiki.subjects.documentedByEmpty}
      </p>
    );
  }

  const now = new Date();
  return (
    <ul className="space-y-1">
      {pages.map((page) => {
        const level = freshnessOf(page, now);
        return (
          <li key={page.id}>
            <Link
              href={`/projects/${projectKey}/wiki?page=${page.slug ?? page.id}`}
              className="group/doc flex flex-wrap items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50"
            >
              <BookOpen
                className="size-4 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate group-hover/doc:underline">
                {page.title}
              </span>
              {/* Seul ce qui ALERTE s'affiche : une page à jour n'a rien à
                  signaler, et un badge vert sur chaque ligne noierait les deux
                  qui méritent l'attention. */}
              {level && level !== "fresh" && (
                <Badge
                  variant="outline"
                  className={cn("shrink-0 font-normal", FRESHNESS_STYLE[level])}
                  title={fmt(t.wiki.subjects.checkedOn, {
                    date: formatDate(page.reviewedAt ?? page.updatedAt),
                  })}
                >
                  {t.wiki.subjects.freshness[level]}
                </Badge>
              )}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
