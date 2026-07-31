/**
 * ENCARTS d'une page : « note », « attention », « important ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LA SYNTAXE DES ALERTES PLUTÔT QU'UNE DIRECTIVE
 *
 * Un encart s'écrit comme une citation dont la première ligne porte un marqueur :
 *
 *     > [!NOTE]
 *     > Ce qu'il faut savoir.
 *
 * C'est la convention de GitHub, et elle a une propriété que n'a aucune syntaxe
 * inventée : elle DÉGRADE PROPREMENT. Lue par n'importe quel autre outil - un
 * export, un `cat` dans un terminal, un éditeur tiers -, elle reste une citation
 * parfaitement sensée. Une directive `:::note` aurait produit trois deux-points
 * orphelins, et il aurait fallu ajouter un greffon à l'analyseur pour la relire.
 *
 * Elle traverse aussi l'éditeur riche sans dommage : ce n'est qu'une citation,
 * que ProseMirror sait déjà représenter et remettre en Markdown à l'identique.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * REPÉRAGE PAR LIGNE, PAS PAR CONTENU
 *
 * Le marqueur est RETIRÉ du texte avant le rendu - sans quoi « [!NOTE] »
 * s'afficherait dans l'encart. Le rendu doit pourtant savoir quelles citations
 * sont des encarts : on lui rend une table indexée par la LIGNE DE DÉPART de la
 * citation dans le texte nettoyé.
 *
 * C'est la même technique que les ancres du sommaire, et pour la même raison :
 * un compteur d'ordre se décalerait au premier bloc imbriqué, et une
 * reconnaissance par le contenu confondrait deux encarts qui disent la même
 * chose.
 */

export type CalloutKind = "note" | "warning" | "important";

/** Marqueurs reconnus, insensibles à la casse. Table figée : y ajouter une
 *  entrée est sans risque, en retirer une casserait des pages déjà écrites. */
const MARKERS: Record<string, CalloutKind> = {
  NOTE: "note",
  WARNING: "warning",
  IMPORTANT: "important",
  // Synonymes courants, pour ne pas punir qui écrit « TIP » ou « CAUTION ».
  TIP: "note",
  CAUTION: "warning",
};

/** Marqueur ÉCRIT pour chaque genre - un seul par genre, les synonymes ne se
 *  lisent que dans l'autre sens. */
export const CALLOUT_MARKER: Record<CalloutKind, string> = {
  note: "NOTE",
  warning: "WARNING",
  important: "IMPORTANT",
};

export function isCalloutKind(value: unknown): value is CalloutKind {
  return value === "note" || value === "warning" || value === "important";
}

export interface CalloutScan {
  /** Markdown débarrassé des marqueurs, prêt à être rendu. */
  content: string;
  /** Genre de l'encart, indexé par la ligne (1-based) de la citation. */
  byLine: Map<number, CalloutKind>;
}

/**
 * `> [!NOTE]`, éventuellement indenté, et éventuellement ÉCHAPPÉ.
 *
 * L'antislash n'est pas une coquetterie : tout sérialiseur Markdown protège un
 * crochet en début de ligne, où il pourrait ouvrir une définition de lien.
 * L'éditeur en mise en forme produit donc « > \[!NOTE] » sans qu'on lui demande
 * rien. Refuser cette écriture aurait fait mentir le bouton de la barre d'outils
 * - il aurait inséré un encart que la lecture n'aurait pas reconnu.
 *
 * Elle reste par ailleurs correcte à la lecture : `\[` s'affiche « [ » partout
 * ailleurs, la citation garde donc tout son sens hors de l'application.
 */
const MARKER_RE = /^(\s{0,3}>\s?)\\?\[!([A-Za-z]+)\\?\]\s*$/;
/** Une ligne de citation, quelle qu'elle soit. */
const QUOTE_RE = /^\s{0,3}>/;

/**
 * Retire les marqueurs d'encart et dit où ils se trouvaient.
 *
 * Un marqueur n'est retenu qu'en TÊTE de citation : « > [!NOTE] » au milieu d'un
 * paragraphe cité est du texte que l'auteur a écrit, pas une déclaration.
 */
export function scanCallouts(markdown: string): CalloutScan {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const out: string[] = [];
  const byLine = new Map<number, CalloutKind>();
  let insideFence: string | null = null;
  /** Vrai tant qu'on n'a pas quitté la citation commencée. */
  let inQuote = false;

  for (const line of lines) {
    const fence = /^\s{0,3}(`{3,}|~{3,})/.exec(line);
    if (fence) {
      const marker = fence[1][0];
      if (insideFence === null) insideFence = marker;
      else if (insideFence === marker) insideFence = null;
      inQuote = false;
      out.push(line);
      continue;
    }
    // Dans un bloc de code, « > [!NOTE] » est un exemple, pas un encart.
    if (insideFence !== null) {
      out.push(line);
      continue;
    }

    const isQuote = QUOTE_RE.test(line);
    const marker = isQuote && !inQuote ? MARKER_RE.exec(line) : null;
    if (marker) {
      const kind = MARKERS[marker[2].toUpperCase()];
      if (kind) {
        // La citation commencera à la ligne SUIVANTE du texte nettoyé, celle-ci
        // disparaissant : c'est cette position-là qui doit être enregistrée.
        byLine.set(out.length + 1, kind);
        inQuote = true;
        continue; // marqueur retiré
      }
    }
    inQuote = isQuote;
    out.push(line);
  }

  return { content: out.join("\n"), byLine };
}

/** Markdown d'un encart vide, tel que l'insère la barre d'outils. */
export function calloutTemplate(kind: CalloutKind): string {
  return `> [!${CALLOUT_MARKER[kind]}]\n> `;
}

/* ───────────────────────────────────────────────────────────────────────────
   LE MARQUEUR VU DE L'ÉDITEUR RICHE

   L'éditeur en mise en forme ne travaille pas sur des lignes mais sur l'arbre
   qu'en tire remark. Le marqueur y a deux formes selon la façon dont l'auteur
   a écrit sa citation :

       > [!NOTE]              > [!NOTE]
       > Le texte.
                              > Le texte.

   La première ne fait qu'UN paragraphe - le saut de ligne y est « doux » -,
   la seconde en fait deux. Les deux doivent donner le même encart, sans quoi
   une page se relirait autrement selon qui l'a écrite.

   Ce module rend le genre ET le corps débarrassé du marqueur : l'éditeur ne
   met donc jamais « [!NOTE] » dans le document, il le réécrit à
   l'enregistrement. C'est ce qui permet à l'encart de s'afficher comme il se
   lira, au lieu d'exposer sa syntaxe à qui n'écrit pas de Markdown.
   ─────────────────────────────────────────────────────────────────────────── */

/** Forme minimale d'un nœud mdast, réduite à ce que ce module regarde. */
export interface MarkdownNodeLike {
  type: string;
  value?: string;
  children?: MarkdownNodeLike[];
}

/** Marqueur nu - « [!NOTE] » -, tel qu'il apparaît une fois le « > » analysé. */
const BARE_MARKER_RE = /^\\?\[!([A-Za-z]+)\\?\]$/;

/** Genre déclaré par un marqueur seul sur sa ligne, ou `null`. */
export function calloutMarker(text: string): CalloutKind | null {
  const found = BARE_MARKER_RE.exec(text.trim());
  return found ? (MARKERS[found[1].toUpperCase()] ?? null) : null;
}

/**
 * Sépare le marqueur du corps d'une citation.
 *
 * Rend `null` pour une citation ordinaire - c'est-à-dire la grande majorité :
 * l'absence de marqueur n'est pas une anomalie, c'est le cas courant.
 */
export function splitCalloutMarker(
  children: readonly MarkdownNodeLike[],
): { kind: CalloutKind; body: MarkdownNodeLike[] } | null {
  const first = children[0];
  if (!first || first.type !== "paragraph") return null;

  const inline = first.children ?? [];
  const head = inline[0];
  if (!head || head.type !== "text" || typeof head.value !== "string") return null;

  // Le marqueur occupe la première LIGNE du paragraphe. Selon les greffons
  // actifs, le reste du paragraphe suit dans la même valeur ou après un nœud
  // « break » ; les deux se traitent ici, pour que ce module ne dépende pas de
  // la configuration de l'éditeur qui l'appelle.
  const [firstLine, ...following] = head.value.split("\n");
  const kind = calloutMarker(firstLine);
  if (!kind) return null;

  const remainder = following.join("\n");
  const tail = inline.slice(1);
  const inlineBody: MarkdownNodeLike[] = remainder
    ? [{ type: "text", value: remainder }, ...tail]
    : // Un « break » juste après le marqueur n'est que la fin de sa ligne.
      tail[0]?.type === "break"
      ? tail.slice(1)
      : tail;

  const rest = children.slice(1);
  return {
    kind,
    body: inlineBody.length
      ? [{ ...first, children: inlineBody }, ...rest]
      : [...rest],
  };
}
