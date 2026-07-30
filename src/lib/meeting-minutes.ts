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
 * l'intérieur d'un thème (`notes`) sont conservés tels quels et réaffichés. Un
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
  /** Lignes du thème qui ne sont pas des items, conservées telles quelles. */
  notes: string;
}

export interface ParsedMeeting {
  /** Texte précédant le premier thème (ordre du jour, participants…). */
  preamble: string;
  themes: MeetingTheme[];
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
    const notes: string[] = [];
    let currentIndent: number | null = null;
    let insideFence: string | null = null;

    for (const line of body) {
      const fenceMatch = FENCE_RE.exec(line);
      if (fenceMatch) {
        const marker = fenceMatch[1][0];
        if (insideFence === null) insideFence = marker;
        else if (insideFence === marker) insideFence = null;
        currentIndent = null;
        notes.push(line);
        continue;
      }
      if (insideFence !== null) {
        notes.push(line);
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
        last.text = `${last.text} ${line.trim()}`.trim();
        continue;
      }

      if (!line.trim()) {
        // Une ligne vide ne rompt pas l'item courant (listes aérées), mais elle
        // n'a rien à faire dans les notes tant qu'aucun texte ne l'y rejoint.
        notes.push(line);
        continue;
      }
      currentIndent = null;
      notes.push(line);
    }

    return {
      letter,
      title: head.title,
      items,
      notes: notes.join("\n").trim(),
    };
  });

  return { preamble, themes };
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
