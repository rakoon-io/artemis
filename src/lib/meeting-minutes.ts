/**
 * COMPTE RENDU DE RÉUNION - logique pure (aucun accès base, aucune dépendance :
 * voir meeting-minutes.test.ts).
 *
 * Un compte rendu est une page de wiki ordinaire. Sa structure est portée par le
 * MARKDOWN, pas par des tables : un thème n'existe que le temps d'une réunion,
 * l'inscrire en base créerait un référentiel à maintenir pour des intitulés qui
 * ne resserviront pas. La conséquence heureuse : la recherche plein texte,
 * l'export et l'historique des pages continuent de fonctionner sans rien savoir
 * des réunions, et une page cesse d'être un compte rendu sans perdre une ligne.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CONVENTION D'ÉCRITURE
 *
 *   ## Budget                       <- un thème (titre de niveau 2)
 *   - (info) Le budget est validé   <- un item d'INFORMATION
 *   - (action) Relancer le devis    <- un item d'ACTION
 *   - [ ] Relancer le devis         <- idem : la case à cocher de la barre
 *                                      d'outils produit naturellement une action
 *
 * La LETTRE d'un thème est déduite de sa position (1er = A, 2e = B…), jamais
 * saisie : rien à tenir à jour, pas de doublon possible, et réordonner les thèmes
 * renumérote tout seul. Les références d'items en découlent : A-01, A-02, B-01…
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * RIEN NE SE PERD
 *
 * Le texte placé avant le premier thème (`preamble`) et les lignes non listées à
 * l'intérieur d'un thème (`notesBefore` / `notesAfter`) sont conservés tels quels
 * et réaffichés - y compris à la RÉÉCRITURE, ce qui autorise l'édition
 * graphique des points sans jamais escamoter le reste de la page. Un
 * compte rendu reste donc une page de wiki que l'on peut écrire librement ; la
 * mise en tableau ne s'applique qu'aux listes.
 */

/** Nature d'un item : une information constatée, ou une action à mener. */
export type MeetingItemKind = "info" | "action";

export interface MeetingItem {
  /** Référence stable dans la réunion : « A-01 ». */
  ref: string;
  kind: MeetingItemKind;
  text: string;
}

export interface MeetingTheme {
  /** Lettre déduite de la position : A, B, C… */
  letter: string;
  title: string;
  items: MeetingItem[];
  /**
   * Lignes non listées SITUÉES AVANT le premier point (un paragraphe de
   * contexte, le cas courant). Conservées telles quelles.
   *
   * Le découpage avant / après n'est pas une coquetterie : c'est lui qui rend la
   * réécriture FIDÈLE. Avec une seule zone de notes, l'éditeur graphique
   * remonterait ou descendrait le paragraphe à chaque enregistrement - le texte
   * serait préservé, mais il se déplacerait tout seul.
   */
  notesBefore: string;
  /** Lignes non listées situées après le dernier point. */
  notesAfter: string;
}

export interface ParsedMeeting {
  /** Texte précédant le premier thème (ordre du jour, participants…). */
  preamble: string;
  themes: MeetingTheme[];
  /**
   * Niveau de titre des thèmes tel qu'il a été écrit (2 pour `##`). Conservé
   * pour que la réécriture n'impose pas sa propre convention à une page qui en
   * suivait une autre.
   */
  headingLevel: number;
}

/** Ancre HTML du récapitulatif, partagée par le lien d'en-tête et la section. */
export const ACTIONS_ANCHOR = "recapitulatif-des-actions";

/** Titre ATX. Le niveau est capturé : il départage thèmes et sous-titres. */
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
/** Ouverture / fermeture d'un bloc de code clôturé. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;
/** Puce de liste, avec son indentation. */
const ITEM_RE = /^(\s*)[-*+]\s+(.*)$/;
/** Case à cocher GFM en tête d'item : produite par la barre d'outils. */
const CHECKBOX_RE = /^\[[ xX]\]\s*/;
/** Marqueur explicite de nature : « (action) », « (info) »… */
const MARKER_RE = /^\(([^)]{1,20})\)\s*/;

/**
 * Lettre d'un thème à partir de son rang, façon colonnes de tableur :
 * A…Z, puis AA, AB… Une réunion à plus de 26 thèmes n'existe pas, mais un
 * débordement silencieux qui produirait « [ » serait pire que ce détour.
 */
export function themeLetter(index: number): string {
  let n = index;
  let letter = "";
  do {
    letter = String.fromCharCode(65 + (n % 26)) + letter;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return letter;
}

/** Référence d'un item : « A-01 ». Deux chiffres, pour que la colonne s'aligne. */
export function formatItemRef(letter: string, position: number): string {
  return `${letter}-${String(position).padStart(2, "0")}`;
}

/**
 * Formes acceptées pour désigner la nature d'un item. Comme pour les rubriques
 * de ticket, la table est en AJOUT SEUL : retirer une forme rendrait muets des
 * comptes rendus déjà écrits.
 */
const KIND_ALIASES: Record<string, MeetingItemKind> = {
  action: "action",
  actions: "action",
  a: "action",
  "a faire": "action",
  todo: "action",
  decision: "action",
  info: "info",
  infos: "info",
  information: "info",
  informations: "info",
  i: "info",
  note: "info",
};

/** Réduit un marqueur à une forme comparable (sans accent ni casse). */
function normalizeMarker(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:.]+$/, "")
    .trim()
    .toLowerCase();
}

/**
 * Détermine la nature d'un item et renvoie son texte débarrassé du marqueur.
 * Par défaut INFORMATION : un item non qualifié est une note, pas un engagement.
 * Se tromper dans ce sens fait oublier une action de moins qu'une promesse
 * imaginaire dans le récapitulatif.
 */
export function readItemKind(raw: string): { kind: MeetingItemKind; text: string } {
  const checkbox = CHECKBOX_RE.exec(raw);
  if (checkbox) {
    return { kind: "action", text: raw.slice(checkbox[0].length).trim() };
  }
  const marker = MARKER_RE.exec(raw);
  if (marker) {
    const kind = KIND_ALIASES[normalizeMarker(marker[1])];
    if (kind) return { kind, text: raw.slice(marker[0].length).trim() };
  }
  return { kind: "info", text: raw.trim() };
}

/**
 * Découpe un compte rendu. Renvoie `null` si la page ne comporte aucun thème :
 * ce n'est alors pas une réunion mise en forme, et l'appelant l'affiche comme
 * une page de wiki ordinaire plutôt que d'inventer une structure.
 *
 * Le niveau de titre des thèmes est celui du PREMIER titre rencontré ; les titres
 * plus profonds appartiennent au contenu du thème. Sans cette règle, un
 * « ### Détail » écrit sous un thème ouvrirait un thème vide.
 */
export function parseMeeting(
  markdown: string | null | undefined,
): ParsedMeeting | null {
  const text = (markdown ?? "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return null;
  const lines = text.split("\n");

  // 1. Relever les titres hors blocs de code.
  const headings: Array<{ line: number; level: number; title: string }> = [];
  let fence: string | null = null;
  for (let i = 0; i < lines.length; i += 1) {
    const fenceMatch = FENCE_RE.exec(lines[i]);
    if (fenceMatch) {
      const marker = fenceMatch[1][0];
      if (fence === null) fence = marker;
      else if (fence === marker) fence = null;
      continue;
    }
    if (fence !== null) continue;
    const heading = HEADING_RE.exec(lines[i]);
    if (heading) {
      headings.push({
        line: i,
        level: heading[1].length,
        title: heading[2].trim(),
      });
    }
  }
  if (headings.length === 0) return null;

  const themeLevel = headings[0].level;
  const themeHeads = headings.filter((head) => head.level === themeLevel);
  if (themeHeads.length === 0) return null;

  const preamble = lines.slice(0, themeHeads[0].line).join("\n").trim();

  const themes: MeetingTheme[] = themeHeads.map((head, index) => {
    const end = themeHeads[index + 1]?.line ?? lines.length;
    const body = lines.slice(head.line + 1, end);
    const letter = themeLetter(index);

    const items: MeetingItem[] = [];
    const notesBefore: string[] = [];
    const notesAfter: string[] = [];
    const noteSink = () => (items.length === 0 ? notesBefore : notesAfter);
    let currentIndent: number | null = null;
    let insideFence: string | null = null;

    for (const line of body) {
      const fenceMatch = FENCE_RE.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (insideFence === null) insideFence = marker;
        else if (insideFence === marker) insideFence = null;
        currentIndent = null;
        noteSink().push(line);
        continue;
      }
      if (insideFence !== null) {
        noteSink().push(line);
        continue;
      }

      const item = ITEM_RE.exec(line);
      if (item) {
        const { kind, text } = readItemKind(item[2]);
        items.push({
          ref: formatItemRef(letter, items.length + 1),
          kind,
          text,
        });
        currentIndent = item[1].length;
        continue;
      }

      // Ligne indentée sous un item : c'est sa suite, pas une note détachée.
      const indented = /^(\s+)\S/.exec(line);
      if (
        currentIndent !== null &&
        indented &&
        indented[1].length > currentIndent &&
        items.length > 0
      ) {
        const last = items[items.length - 1];
        // Un ANTISLASH terminal est le retour à la ligne dur de Markdown : la
        // suite s'écrit sous la précédente, et le point garde la forme qu'on
        // lui a donnée en le saisissant. Sans lui, la ligne n'est qu'un repli
        // de paragraphe - Markdown la recolle par une espace, et nous aussi.
        last.text = last.text.endsWith("\\")
          ? `${last.text.slice(0, -1).trimEnd()}\n${line.trim()}`
          : `${last.text} ${line.trim()}`.trim();
        continue;
      }

      if (!line.trim()) {
        // Une ligne vide ne rompt pas l'item courant (listes aérées), mais elle
        // n'a rien à faire dans les notes tant qu'aucun texte ne l'y rejoint.
        noteSink().push(line);
        continue;
      }
      currentIndent = null;
      noteSink().push(line);
    }

    return {
      letter,
      title: head.title,
      items,
      notesBefore: notesBefore.join("\n").trim(),
      notesAfter: notesAfter.join("\n").trim(),
    };
  });

  return { preamble, themes, headingLevel: themeLevel };
}

/**
 * Réécrit un compte rendu en Markdown. Inverse exact de `parseMeeting` : c'est
 * ce qui autorise l'édition graphique des points, laquelle réécrit toute la page
 * à chaque enregistrement.
 *
 * La nature est écrite EXPLICITEMENT, y compris « (info) » que l'analyseur
 * déduirait par défaut. Le Markdown reste ainsi auto-descriptif : qui rouvre la
 * page dans l'éditeur de texte voit ce que l'interface affichait, et le
 * classement d'un point ne dépend plus d'une convention implicite.
 *
 * Les lettres et les références ne sont PAS écrites : elles se déduisent de la
 * position (cf. l'en-tête du module). Les figer dans le texte les rendrait
 * fausses au premier déplacement.
 */
export function serializeMeeting(meeting: ParsedMeeting): string {
  const hashes = "#".repeat(Math.min(Math.max(meeting.headingLevel, 1), 6));
  const blocks: string[] = [];

  const preamble = meeting.preamble.trim();
  if (preamble) blocks.push(preamble);

  for (const theme of meeting.themes) {
    const parts: string[] = [`${hashes} ${theme.title.trim()}`];
    const before = theme.notesBefore.trim();
    if (before) parts.push(before);
    const items = theme.items
      // Filtré sur les OBJETS, pas sur les textes déjà extraits : en filtrant
      // après coup, l'index ne désignait plus le même point, et un point vidé
      // de son texte décalait la nature de tous ceux qui le suivaient.
      .filter((item) => item.text.trim())
      .map((item) => {
        const kind = item.kind === "action" ? "action" : "info";
        // Un point tient sur PLUSIEURS LIGNES depuis que la touche Entrée y
        // saute une ligne. Deux précautions pour qu'il les retrouve :
        //  - les lignes suivantes sont INDENTÉES, sans quoi la relecture les
        //    voit quitter le point et les range en texte libre du thème ;
        //  - la ligne précédente se termine par un antislash, retour à la
        //    ligne dur de Markdown, sans quoi elles s'y recolleraient en une
        //    seule phrase - une espace, c'est tout ce que vaut un simple
        //    passage à la ligne.
        // Les lignes vides sont resserrées : indentées, elles ouvriraient un
        // second paragraphe dans le point et le rendraient illisible en brut.
        const lines = item.text
          .trim()
          .split(/\n+/)
          .map((line) => line.trim());
        return `- (${kind}) ${lines.join("\\\n  ")}`;
      });
    if (items.length > 0) parts.push(items.join("\n"));
    const after = theme.notesAfter.trim();
    if (after) parts.push(after);
    blocks.push(parts.join("\n\n"));
  }

  return blocks.join("\n\n");
}

/** Une action, telle qu'elle apparaît dans le récapitulatif de fin. */
export interface MeetingAction extends MeetingItem {
  themeLetter: string;
  themeTitle: string;
}

/**
 * Toutes les actions de la réunion, dans l'ordre de lecture. C'est ce qui alimente
 * le récapitulatif de fin de compte rendu - et donc la seule liste que l'on relit
 * après la réunion.
 */
export function meetingActions(meeting: ParsedMeeting): MeetingAction[] {
  return meeting.themes.flatMap((theme) =>
    theme.items
      .filter((item) => item.kind === "action")
      .map((item) => ({
        ...item,
        themeLetter: theme.letter,
        themeTitle: theme.title,
      })),
  );
}

/** Nombre d'items, toutes natures confondues (en-tête de la page de suivi). */
export function countMeetingItems(meeting: ParsedMeeting): number {
  return meeting.themes.reduce((total, theme) => total + theme.items.length, 0);
}

/**
 * BROUILLON D'ÉDITION d'une page datée, garanti sans perte.
 *
 * `parseMeeting` renvoie `null` quand la page ne porte aucun titre de thème.
 * C'est juste à la LECTURE : il n'y a alors pas de structure à afficher, et
 * l'on rend une page de wiki ordinaire.
 *
 * À l'ÉDITION, ce `null` se traduisait en « préambule vide, aucun thème ».
 * Ouvrir l'éditeur de points sur une telle page, puis enregistrer, réécrivait
 * donc la page à partir de rien : TOUT SON CONTENU ÉTAIT EFFACÉ. Le cas n'est
 * pas théorique - c'est celui de toute page que l'on vient de déclarer compte
 * rendu, et de tout compte rendu naissant.
 *
 * Faute de structure, tout est préambule. La réécriture rend alors exactement
 * le texte reçu, et l'éditeur ne peut plus rien perdre de ce qu'il n'a pas su
 * relire.
 */
export function meetingDraft(markdown: string | null | undefined): ParsedMeeting {
  return (
    parseMeeting(markdown) ?? {
      preamble: (markdown ?? "").trim(),
      themes: [],
      headingLevel: 2,
    }
  );
}
