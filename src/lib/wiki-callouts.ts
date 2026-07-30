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
  const marker =
    kind === "note" ? "NOTE" : kind === "warning" ? "WARNING" : "IMPORTANT";
  return `> [!${marker}]\n> `;
}
