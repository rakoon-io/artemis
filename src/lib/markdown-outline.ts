import { slugify } from "./slug";

/**
 * SOMMAIRE d'un document Markdown - relevé des titres pour naviguer dans une
 * page longue (module pur, testable isolément : voir markdown-outline.test.ts).
 *
 * Deux usages, un seul calcul :
 *  - construire le sommaire affiché au-dessus de la page ;
 *  - poser l'ancre HTML de chaque titre au rendu.
 * Les deux passent par `anchorFor`, faute de quoi un lien du sommaire pourrait
 * désigner une ancre que le rendu n'a pas écrite - le clic ne ferait alors rien,
 * sans le moindre message.
 */

/**
 * Préfixe des ancres de section. Il évite qu'un titre nommé « Récapitulatif des
 * actions » n'entre en collision avec l'ancre du récapitulatif d'un compte
 * rendu, laquelle n'est pas un titre.
 */
export const SECTION_ANCHOR_PREFIX = "section-";

export interface OutlineHeading {
  /** Niveau ATX écrit dans le document (1 pour `#`, 2 pour `##`…). */
  level: number;
  title: string;
  /** Ancre HTML, unique dans la page. */
  anchor: string;
  /**
   * Profondeur RELATIVE au titre le plus haut du document (0 pour lui). Une page
   * qui commence en `##` s'affiche ainsi sans décalage inutile : ce qui compte
   * pour le lecteur, c'est la hiérarchie, pas le niveau absolu choisi.
   */
  depth: number;
  /**
   * Ligne (à partir de 1) où le titre est écrit. C'est par elle que le rendu
   * retrouve l'ancre à poser : un rapprochement par POSITION SOURCE, sans
   * compteur ni état, donc insensible à l'ordre dans lequel React évalue les
   * titres. La liaison des citations de tickets ne change pas les lignes.
   */
  line: number;
}

/**
 * Un titre et ce qu'il coiffe. C'est la forme dont a besoin un sommaire
 * REPLIABLE : la liste plate dit la profondeur de chacun, elle ne dit pas qui
 * disparaît quand on replie.
 */
export interface OutlineNode {
  head: OutlineHeading;
  children: OutlineNode[];
}

/**
 * Reconstruit la hiérarchie d'un sommaire à partir de la liste plate.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LA PROFONDEUR NE SUFFIT PAS À DIRE
 *
 * `extractOutline` annote chaque titre de sa profondeur, ce qui suffit à
 * l'INDENTER. Replier demande davantage : il faut savoir que replier « 3. Deux
 * écarts » emporte ses trois sous-titres et s'arrête au titre suivant de même
 * rang. C'est une relation de parenté, et elle ne se lit pas dans un nombre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LES SAUTS DE NIVEAU SONT LA RÈGLE, PAS L'EXCEPTION
 *
 * Un document écrit à la main passe de `##` à `####` sans prévenir. La pile
 * traite ce cas sans invention : le `####` devient enfant du `##`, parce que
 * c'est le dernier titre plus haut que lui. On ne fabrique pas de niveau
 * intermédiaire vide, et l'on ne remonte pas non plus le titre d'un cran - les
 * deux mentiraient sur ce que l'auteur a écrit.
 *
 * Un titre plus profond que tout ce qui précède - le tout premier du document,
 * si l'auteur commence par un `###` après un `#` - se rattache à la racine :
 * aucun titre ne peut être orphelin, sans quoi il disparaîtrait du sommaire.
 */
export function outlineTree(headings: readonly OutlineHeading[]): OutlineNode[] {
  const racines: OutlineNode[] = [];
  // Pile des ancêtres ouverts, du moins profond au plus profond.
  const pile: OutlineNode[] = [];

  for (const head of headings) {
    const noeud: OutlineNode = { head, children: [] };
    while (pile.length > 0 && pile[pile.length - 1].head.depth >= head.depth) {
      pile.pop();
    }
    const parent = pile[pile.length - 1];
    if (parent) parent.children.push(noeud);
    else racines.push(noeud);
    pile.push(noeud);
  }
  return racines;
}

/** Ancres des titres qui coiffent au moins un sous-titre - les seuls repliables. */
export function collapsibleAnchors(nodes: readonly OutlineNode[]): string[] {
  const out: string[] = [];
  const walk = (liste: readonly OutlineNode[]) => {
    for (const n of liste) {
      if (n.children.length > 0) {
        out.push(n.head.anchor);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/** Titre ATX, avec ses fermetures optionnelles (`## Titre ##`). */
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
/** Ouverture / fermeture d'un bloc de code clôturé. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

/**
 * Ancre d'un titre, unique dans la page. `seen` porte le compte des intitulés
 * déjà rencontrés : deux sections « Divers » donnent `section-divers` puis
 * `section-divers-2`, sinon le second lien ramènerait au premier.
 *
 * La fonction MUTE `seen` : l'appelant parcourt le document dans l'ordre, et
 * c'est cet ordre partagé qui garantit que sommaire et rendu s'accordent.
 */
export function anchorFor(title: string, seen: Map<string, number>): string {
  const base = slugify(title);
  const count = seen.get(base) ?? 0;
  seen.set(base, count + 1);
  return `${SECTION_ANCHOR_PREFIX}${base}${count === 0 ? "" : `-${count + 1}`}`;
}

/**
 * Titres d'un document, dans l'ordre de lecture. Les titres situés dans un bloc
 * de code sont ignorés : ce sont des données, pas de la structure - un extrait
 * de shell commençant par `# commentaire` n'ouvre pas une section.
 */
export function extractOutline(
  markdown: string | null | undefined,
): OutlineHeading[] {
  const text = (markdown ?? "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return [];

  const found: Array<{ level: number; title: string; line: number }> = [];
  let fence: string | null = null;
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const fenceMatch = FENCE_RE.exec(line);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = HEADING_RE.exec(line);
    if (heading) {
      found.push({
        level: heading[1].length,
        title: heading[2].trim(),
        line: i + 1,
      });
    }
  }
  if (found.length === 0) return [];

  const topLevel = Math.min(...found.map((head) => head.level));
  const seen = new Map<string, number>();
  return found.map((head) => ({
    level: head.level,
    title: head.title,
    line: head.line,
    anchor: anchorFor(head.title, seen),
    // Bornée : un saut de `#` à `####` ne doit pas creuser trois niveaux
    // d'indentation pour un document qui n'en a que deux.
    depth: Math.max(0, head.level - topLevel),
  }));
}
