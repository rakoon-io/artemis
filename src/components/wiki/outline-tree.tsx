"use client";

import { useMemo, useState } from "react";
import { ChevronRight, FoldVertical, UnfoldVertical } from "lucide-react";
import {
  collapsibleAnchors,
  outlineTree,
  type OutlineHeading,
  type OutlineNode,
} from "@/lib/markdown-outline";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

/**
 * SOMMAIRE REPLIABLE : chaque titre peut refermer ce qu'il coiffe.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI REPLIER
 *
 * Le sommaire était une liste plate, seulement indentée. Sur une page à quarante
 * sections - le cas réel qui a motivé ceci -, la colonne devient un mur : on y
 * cherche « 7. Arbitrages » à l'œil, en défilant dans un panneau qui défile
 * lui-même à l'intérieur d'une page qui défile. Trois défilements imbriqués pour
 * atteindre un titre.
 *
 * Replié aux seuls titres de premier rang, le même sommaire tient en un écran et
 * redevient ce qu'il doit être : un plan qu'on embrasse d'un regard.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TOUT DÉPLIÉ AU DÉPART
 *
 * On conserve la doctrine du volet lui-même : un outil de navigation qu'il faut
 * d'abord ouvrir n'en est plus tout à fait un. Le repli est une commodité qu'on
 * demande, jamais un état qu'on subit en arrivant.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX CIBLES DISTINCTES SUR UNE MÊME LIGNE
 *
 * Le chevron replie, le texte navigue. C'est la raison pour laquelle ce composant
 * est en React et non en `<details>` natif comme le reste du dépôt : dans un
 * `<summary>`, un clic sur un lien replie ET navigue, les deux à la fois. Il n'y
 * a pas de moyen honnête de séparer les deux gestes sans JavaScript.
 *
 * Le chevron n'apparaît que sur les titres qui coiffent quelque chose. Ailleurs,
 * un décalage de même largeur garde les intitulés alignés : une colonne de
 * titres dont le bord gauche ondule selon qu'ils ont ou non des enfants se lit
 * beaucoup moins bien.
 */
export function OutlineTree({
  headings,
  ariaLabel,
  className,
}: {
  headings: OutlineHeading[];
  ariaLabel: string;
  className?: string;
}) {
  const t = useDict();
  const arbre = useMemo(() => outlineTree(headings), [headings]);
  const repliables = useMemo(() => collapsibleAnchors(arbre), [arbre]);
  const [replies, setReplies] = useState<ReadonlySet<string>>(new Set());

  const basculer = (ancre: string) =>
    setReplies((actuels) => {
      const suivant = new Set(actuels);
      if (!suivant.delete(ancre)) suivant.add(ancre);
      return suivant;
    });

  const toutReplie = repliables.length > 0 && replies.size === repliables.length;

  return (
    <div className={cn("flex min-h-0 flex-col", className)}>
      {/* La commande globale ne paraît que s'il y a quelque chose à replier :
          sur un sommaire tout plat, elle n'aurait aucun effet et ne ferait
          qu'occuper une ligne. */}
      {repliables.length > 0 && (
        <div className="flex justify-end px-3 pb-1">
          <button
            type="button"
            onClick={() =>
              setReplies(toutReplie ? new Set() : new Set(repliables))
            }
            className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
          >
            {toutReplie ? (
              <UnfoldVertical className="size-3.5" aria-hidden />
            ) : (
              <FoldVertical className="size-3.5" aria-hidden />
            )}
            {toutReplie ? t.wiki.outline.expandAll : t.wiki.outline.collapseAll}
          </button>
        </div>
      )}

      <nav
        aria-label={ariaLabel}
        /**
         * Borné à la hauteur RESTANTE sous l'en-tête collé et le décalage de la
         * colonne : un sommaire de trente sections dépasserait sinon l'écran et
         * deviendrait inatteignable par le bas. C'est ce plafond qui rend le
         * collage utilisable.
         *
         * `svh` et non `vh` ni `dvh`. Les trois diffèrent sur un téléphone :
         * `vh` (= `lvh`) compte la fenêtre BARRE D'URL RÉTRACTÉE, hauteur qu'on
         * n'a pas encore en arrivant - le volet dépassait donc l'écran. `dvh`
         * corrige l'arrivée mais VARIE pendant qu'on défile : le plafond grandit
         * quand la barre se rétracte, et tout l'article rendu dessous se décale
         * sous les doigts. `svh` est la petite fenêtre, une valeur fixe : jamais
         * trop haute, jamais mouvante. Sur un écran d'ordinateur, les trois sont
         * égales.
         */
        className="slim-scrollbar flex max-h-[calc(100svh-9rem)] flex-col gap-0.5 overflow-y-auto px-3 pb-3"
      >
        <Branche
          noeuds={arbre}
          replies={replies}
          onBasculer={basculer}
          repliables={repliables}
        />
      </nav>
    </div>
  );
}

function Branche({
  noeuds,
  replies,
  onBasculer,
  repliables,
}: {
  noeuds: OutlineNode[];
  replies: ReadonlySet<string>;
  onBasculer: (ancre: string) => void;
  repliables: string[];
}) {
  const t = useDict();
  return (
    <>
      {noeuds.map((noeud) => {
        const ancre = noeud.head.anchor;
        const aDesEnfants = noeud.children.length > 0;
        const replie = replies.has(ancre);
        return (
          <div key={ancre} className="flex flex-col gap-0.5">
            <div
              className="flex items-start gap-0.5"
              // L'indentation dit la hiérarchie ; bornée à trois crans, au-delà
              // desquels une page se lit de toute façon mal.
              style={{ paddingLeft: `${Math.min(noeud.head.depth, 3) * 14}px` }}
            >
              {aDesEnfants ? (
                <button
                  type="button"
                  onClick={() => onBasculer(ancre)}
                  aria-expanded={!replie}
                  aria-controls={`sommaire-${ancre}`}
                  title={
                    replie ? t.wiki.outline.expand : t.wiki.outline.collapse
                  }
                  aria-label={
                    replie ? t.wiki.outline.expand : t.wiki.outline.collapse
                  }
                  className="mt-0.5 shrink-0 rounded p-0.5 text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <ChevronRight
                    className={cn(
                      "size-3.5 transition-transform",
                      !replie && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>
              ) : (
                // Réserve de la largeur du chevron : sans elle, les titres sans
                // enfant se décaleraient à gauche de leurs frères.
                <span className="w-[1.375rem] shrink-0" aria-hidden />
              )}
              <a
                href={`#${ancre}`}
                // Le texte PASSE À LA LIGNE au lieu d'être coupé : un sommaire
                // dont les intitulés se terminent par « … » ne renseigne plus
                // sur rien, et c'est justement sur les titres longs qu'on en a
                // besoin.
                className="min-w-0 flex-1 break-words rounded-md px-1 py-0.5 text-sm leading-snug text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
              >
                {noeud.head.title}
              </a>
            </div>

            {aDesEnfants && (
              // Rendu même replié, masqué par `hidden` : l'état d'ouverture des
              // sous-titres est ainsi conservé quand on referme puis rouvre un
              // parent, au lieu d'être perdu au démontage.
              <div
                id={`sommaire-${ancre}`}
                className={cn("flex flex-col gap-0.5", replie && "hidden")}
              >
                <Branche
                  noeuds={noeud.children}
                  replies={replies}
                  onBasculer={onBasculer}
                  repliables={repliables}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
