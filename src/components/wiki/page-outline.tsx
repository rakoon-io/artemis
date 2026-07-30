import { ChevronRight, List } from "lucide-react";
import { extractOutline, type OutlineHeading } from "@/lib/markdown-outline";
import { getDictionary } from "@/i18n/server";

/**
 * SOMMAIRE d'une page : l'arborescence de ses sections, chacune cliquable.
 *
 * Placé en tête de l'article et non dans la barre latérale : celle-ci navigue
 * ENTRE les pages, le sommaire navigue DANS la page. Les mêler ferait un seul
 * arbre où deux mouvements différents se confondraient.
 *
 * DÉPLIÉ par défaut : c'est un outil de navigation, et un outil de navigation
 * qu'il faut d'abord ouvrir n'en est plus tout à fait un. Il reste repliable
 * pour qui veut rendre la place au texte.
 *
 * Il ne s'affiche qu'à partir de DEUX sections : avec une seule, il n'y a rien à
 * choisir, et le bloc ne ferait que repousser le contenu.
 */

export async function PageOutline({
  content,
  /** Sommaire déjà calculé (cas du compte rendu, qui ne liste que ses thèmes). */
  headings,
  title,
}: {
  content?: string;
  headings?: OutlineHeading[];
  /** Intitulé du bloc ; à défaut, « Sommaire ». */
  title?: string;
}) {
  const t = await getDictionary();
  const outline = headings ?? extractOutline(content);
  // Un seul titre ne fait pas un sommaire : il n'y a rien à choisir.
  if (outline.length < 2) return null;

  return (
    <details open className="group/outline rounded-lg border">
      <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm font-medium [&::-webkit-details-marker]:hidden">
        <ChevronRight
          className="size-4 shrink-0 text-muted-foreground transition-transform group-open/outline:rotate-90"
          aria-hidden
        />
        <List className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        {title ?? t.wiki.outline.title}
      </summary>
      <nav
        aria-label={t.wiki.outline.ariaLabel}
        className="flex flex-col gap-0.5 px-3 pb-3"
      >
        {outline.map((head) => (
          <a
            key={head.anchor}
            href={`#${head.anchor}`}
            // L'indentation dit la hiérarchie ; bornée à trois crans, au-delà
            // desquels une page se lit de toute façon mal.
            style={{ paddingLeft: `${Math.min(head.depth, 3) * 16}px` }}
            className="truncate rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {head.title}
          </a>
        ))}
      </nav>
    </details>
  );
}
