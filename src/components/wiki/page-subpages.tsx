import Link from "next/link";
import { ChevronRight, FolderTree } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * SOUS-PAGES d'une page : son sous-arbre, chaque titre cliquable.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'IL AJOUTE, LA COLONNE DE GAUCHE EXISTANT DÉJÀ
 *
 * La barre latérale montre l'arbre du PROJET ENTIER, où la page lue est une
 * ligne parmi cinquante. Ce bloc-ci ne montre que ce qui pend SOUS elle, dans le
 * fil du texte : on apprend d'un coup d'œil qu'une page est un sommet - et de
 * quoi - sans chercher sa position dans une colonne.
 *
 * Il donne aussi à voir, avant de cliquer, ce que l'export « avec les
 * sous-pages » ira chercher : c'est la même liste, dans le même ordre, tirée de
 * la même fonction (`subtreeOf`). Un document dont on ne devine pas le contenu
 * avant de l'engendrer se découvre trop tard.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DÉPLIÉ, ET FRÈRE DU SOMMAIRE
 *
 * Même forme que `PageOutline` - `<details open>`, même bordure, même hauteur
 * bornée - parce que les deux répondent à la même question posée à deux
 * échelles : « qu'y a-t-il là-dedans ? ». Le sommaire navigue DANS la page,
 * celui-ci navigue SOUS elle. Les distinguer par la forme laisserait croire à
 * deux mécanismes différents.
 *
 * Rien ne s'affiche pour une feuille : un bloc « sous-pages » vide occuperait la
 * place en n'annonçant rien.
 */

export interface SubpageItem {
  id: string;
  title: string;
  href: string;
  /** Profondeur RELATIVE à la page lue : ses enfants directs sont à zéro. */
  depth: number;
  /** Date de réunion, s'il s'agit d'un compte rendu. */
  meetingDate?: Date | string | null;
}

export async function PageSubpages({ items }: { items: SubpageItem[] }) {
  const t = await getDictionary();
  if (items.length === 0) return null;

  return (
    <details open className="group/subpages rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open/subpages:rotate-90"
          aria-hidden
        />
        <FolderTree className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {t.wiki.subpages.title}
        {/* Le compte est dit ici, et pas seulement montré : replié, le bloc
            continue d'annoncer l'ampleur de ce qu'il cache. */}
        <span className="text-xs font-normal text-muted-foreground">
          {fmt(t.wiki.subpages.count, { count: items.length })}
        </span>
      </summary>
      <nav
        aria-label={t.wiki.subpages.ariaLabel}
        // Bornée comme le sommaire : une section de quarante comptes rendus
        // repousserait sinon le texte hors de l'écran.
        className="flex max-h-[calc(100vh-9rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-3"
      >
        {items.map((item) => (
          <Link
            key={item.id}
            href={item.href}
            // Même barème d'indentation que le sommaire, bornée à trois crans.
            style={{ paddingLeft: `${Math.min(item.depth, 3) * 16 + 8}px` }}
            // Le titre passe à la ligne plutôt que d'être coupé : c'est sur les
            // titres longs qu'on a le plus besoin de les lire en entier.
            className="flex flex-wrap items-baseline gap-x-2 break-words rounded-md py-1 pr-2 text-sm leading-snug text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            <span className="break-words">{item.title}</span>
            {/* La date d'une réunion, quand il y en a une : sous « Réunions »,
                les titres se ressemblent et c'est elle qui les distingue. */}
            {item.meetingDate && (
              <span className="text-xs text-muted-foreground/80">
                {formatDate(item.meetingDate)}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </details>
  );
}
