"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";

/**
 * PLAN DU WIKI, REPLIABLE - la colonne de gauche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI IL FALLAIT REPLIER
 *
 * La colonne listait TOUTES les pages du projet, à plat, sans plafond de hauteur
 * ni défilement propre : sur un wiki de cinquante pages, elle s'allongeait
 * indéfiniment. On y cherchait une page en parcourant l'écran de haut en bas,
 * et l'article d'à côté se lisait à droite d'une colonne trois fois plus haute
 * que lui.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI DU JAVASCRIPT, ALORS QUE LE DÉPÔT PRÉFÈRE `<details>`
 *
 * Deux raisons, et la seconde est décisive.
 *
 * D'abord, un `<summary>` qui contient un lien fait les deux gestes à la fois :
 * un clic sur le titre replie ET navigue. Le chevron doit être une cible
 * distincte du titre - c'est déjà la raison d'être de `OutlineTree`.
 *
 * Ensuite, et surtout : la navigation de l'App Router REMONTE le sous-arbre à
 * chaque changement de page. Un `<details>` que l'utilisateur referme se
 * rouvrirait au premier clic sur une page. Or ce pli-ci n'est pas un ornement
 * qu'on ouvre le temps d'un regard : c'est un réglage qu'on pose une fois et
 * qu'on veut garder toute la séance. D'où l'état porté par React, et retenu
 * dans le navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PAGE LUE RESTE TOUJOURS VISIBLE
 *
 * Ses ancêtres sont forcés ouverts, quel que soit ce qui est mémorisé. Sans
 * cela, on arrive par un favori sur une page dont le parent est replié, et le
 * plan prétend qu'on est ailleurs - il montre une sélection qui n'existe pas à
 * l'écran. Le repli mémorisé n'est pas effacé pour autant : il reprend dès
 * qu'on lit une page qui n'en dépend plus.
 */

export interface PlanItem {
  id: string;
  title: string;
  href: string;
  active: boolean;
  depth: number;
  meetingDate?: string | null;
  children: PlanItem[];
}

/* ─────────────────────────────────────────────────────────────────────────────
 * MÉMORISATION DU REPLI, par projet et par section.
 *
 * DANS LE NAVIGATEUR, ET NON DANS L'URL NI DANS UN COOKIE. Les deux autres
 * voies passent par le serveur : chaque chevron déclencherait un rendu complet -
 * une quinzaine de requêtes pour replier une branche. C'est le contraire du but.
 * Le thème du dépôt se mémorise déjà ainsi, par `next-themes`.
 *
 * `useSyncExternalStore` PLUTÔT QU'UN EFFET. Lire le stockage dans un
 * `useEffect` puis appeler `setState` donnerait un premier rendu déplié suivi
 * d'un second replié - un scintillement, et l'avertissement que React réserve à
 * ce motif. Cette API-ci existe exactement pour ça : elle laisse déclarer une
 * valeur POUR LE SERVEUR (déplié, faute de stockage) et une pour le client, sans
 * rendu intermédiaire.
 *
 * En prime, l'abonnement à `storage` synchronise les onglets : replier une
 * branche ici la replie dans la fenêtre d'à côté.
 * ────────────────────────────────────────────────────────────────────────── */

/** Rien de replié : la valeur du serveur, et le repli par défaut. */
const RIEN: ReadonlySet<string> = new Set();

/**
 * Le `Set` est MIS EN CACHE par clé tant que la chaîne stockée ne change pas.
 * `useSyncExternalStore` compare les instantanés par identité : reconstruire un
 * `Set` à chaque lecture ferait boucler le rendu indéfiniment.
 */
const cache = new Map<string, { brut: string | null; set: ReadonlySet<string> }>();
const abonnes = new Set<() => void>();

function lire(cle: string): ReadonlySet<string> {
  let brut: string | null = null;
  try {
    brut = window.localStorage.getItem(cle);
  } catch {
    // Stockage refusé (navigation privée, réglage strict) : on reste déplié.
    // Un plan déplié est utilisable ; une exception non rattrapée, non.
    return RIEN;
  }
  const connu = cache.get(cle);
  if (connu && connu.brut === brut) return connu.set;
  let set: ReadonlySet<string> = RIEN;
  try {
    if (brut) set = new Set(JSON.parse(brut) as string[]);
  } catch {
    // Valeur corrompue par une version antérieure : on repart déplié.
  }
  cache.set(cle, { brut, set });
  return set;
}

function ecrire(cle: string, set: ReadonlySet<string>): void {
  try {
    window.localStorage.setItem(cle, JSON.stringify([...set]));
  } catch {
    /* voir `lire` */
  }
  cache.delete(cle);
  for (const notifier of abonnes) notifier();
}

function useFoldMemory(cle: string) {
  const replies = useSyncExternalStore(
    (notifier) => {
      abonnes.add(notifier);
      window.addEventListener("storage", notifier);
      return () => {
        abonnes.delete(notifier);
        window.removeEventListener("storage", notifier);
      };
    },
    () => lire(cle),
    () => RIEN,
  );
  return [replies, (suivant: ReadonlySet<string>) => ecrire(cle, suivant)] as const;
}

export function WikiPlan({
  projectKey,
  items,
  /** Identifiants à garder ouverts : les ancêtres de la page lue. */
  forceOpen,
  emptyLabel,
}: {
  projectKey: string;
  items: PlanItem[];
  forceOpen: string[];
  emptyLabel?: string;
}) {
  const t = useDict();
  const [replies, memoriser] = useFoldMemory(`artemis:wiki-plan:${projectKey}`);
  const forces = useMemo(() => new Set(forceOpen), [forceOpen]);

  const pliables = useMemo(() => {
    const out: string[] = [];
    const walk = (liste: PlanItem[]) => {
      for (const n of liste) {
        if (n.children.length) {
          out.push(n.id);
          walk(n.children);
        }
      }
    };
    walk(items);
    return out;
  }, [items]);

  if (items.length === 0) {
    return emptyLabel ? (
      <p className="px-3 py-1.5 text-xs italic text-muted-foreground">
        {emptyLabel}
      </p>
    ) : null;
  }

  const toutReplie =
    pliables.length > 0 && pliables.every((id) => replies.has(id));

  return (
    <div className="flex flex-col gap-0.5">
      {pliables.length > 1 && (
        <button
          type="button"
          onClick={() => memoriser(toutReplie ? new Set() : new Set(pliables))}
          className="self-end rounded-md px-1.5 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
        >
          {toutReplie ? t.wiki.outline.expandAll : t.wiki.outline.collapseAll}
        </button>
      )}
      <Branche
        noeuds={items}
        replies={replies}
        forces={forces}
        onBasculer={(id) => {
          const suivant = new Set(replies);
          if (!suivant.delete(id)) suivant.add(id);
          memoriser(suivant);
        }}
      />
    </div>
  );
}

function Branche({
  noeuds,
  replies,
  forces,
  onBasculer,
}: {
  noeuds: PlanItem[];
  replies: ReadonlySet<string>;
  forces: ReadonlySet<string>;
  onBasculer: (id: string) => void;
}) {
  const t = useDict();
  return (
    <>
      {noeuds.map((noeud) => {
        const aDesEnfants = noeud.children.length > 0;
        // Un ancêtre de la page lue reste ouvert, même s'il est mémorisé replié.
        const replie = aDesEnfants && replies.has(noeud.id) && !forces.has(noeud.id);
        return (
          <div key={noeud.id} className="flex flex-col gap-0.5">
            <div className="flex items-stretch">
              {/* LE CHEVRON PRÉCÈDE LES FILETS D'INDENTATION.
                  Les mettre après casserait leur alignement d'une ligne à
                  l'autre ; la réserve de largeur est posée sur TOUTES les
                  lignes, y compris les feuilles, pour que la colonne des
                  titres reste droite. */}
              {aDesEnfants ? (
                <button
                  type="button"
                  onClick={() => onBasculer(noeud.id)}
                  aria-expanded={!replie}
                  aria-label={replie ? t.wiki.outline.expand : t.wiki.outline.collapse}
                  title={replie ? t.wiki.outline.expand : t.wiki.outline.collapse}
                  className="mt-1 h-6 w-5 shrink-0 rounded text-muted-foreground transition-colors hover:bg-accent/50 hover:text-foreground"
                >
                  <ChevronRight
                    className={cn(
                      "mx-auto size-3.5 transition-transform",
                      !replie && "rotate-90",
                    )}
                    aria-hidden
                  />
                </button>
              ) : (
                <span className="w-5 shrink-0" aria-hidden />
              )}

              <Link
                href={noeud.href}
                aria-current={noeud.active ? "page" : undefined}
                title={noeud.title}
                className={cn(
                  "group/page flex min-w-0 flex-1 items-stretch text-sm transition-colors",
                  noeud.active
                    ? "text-foreground"
                    : "text-foreground/75 hover:text-foreground",
                )}
              >
                {/* Filets de rappel : un par cran de profondeur, exactement
                    comme avant le repli. */}
                {Array.from({ length: noeud.depth }, (_, level) => (
                  <span
                    key={level}
                    aria-hidden
                    className="ml-3 w-0 self-stretch border-l"
                  />
                ))}
                <span
                  className={cn(
                    "ml-1 min-w-0 flex-1 rounded-md px-3 py-2 transition-colors",
                    noeud.active
                      ? "bg-primary/10 font-semibold text-foreground dark:bg-primary/20"
                      : "group-hover/page:bg-accent/50",
                  )}
                >
                  <span className="line-clamp-2">{noeud.title}</span>
                  {noeud.meetingDate && (
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {noeud.meetingDate}
                    </span>
                  )}
                </span>
              </Link>
            </div>

            {aDesEnfants && (
              // Rendus même repliés, masqués par `hidden` : leurs propres plis
              // survivent, et les `<Link>` restent dans le document, donc
              // préchargeables par Next.
              <div className={cn("flex flex-col gap-0.5", replie && "hidden")}>
                <Branche
                  noeuds={noeud.children}
                  replies={replies}
                  forces={forces}
                  onBasculer={onBasculer}
                />
              </div>
            )}
          </div>
        );
      })}
    </>
  );
}
