import type { Locale } from "@/i18n/config";

/**
 * MODÈLE DE TICKET - les rubriques imposées à la description d'un ticket dont le
 * type porte `TicketTemplate.REPORT` (cf. schema.prisma).
 *
 * Module PUR : aucun accès base, aucun appel réseau, aucune dépendance runtime
 * (`Locale` est un import de type, effacé à la compilation). Il est donc testable
 * isolément (voir ticket-template.test.ts) et partageable client / serveur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FORMAT DE STOCKAGE
 *
 * Les rubriques ne sont PAS des colonnes : elles vivent dans le Markdown de
 * `Ticket.description`, sous des titres de niveau 2. Trois raisons :
 *  - la description reste un seul champ, donc le rendu, la recherche plein
 *    texte, l'IA et MCP continuent de fonctionner sans rien connaître du modèle ;
 *  - on peut passer un ticket d'un type à l'autre sans migrer de données ;
 *  - un ticket rédigé avant l'activation du modèle reste lisible tel quel.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA QUESTION DÉLICATE : LA LANGUE
 *
 * L'application est bilingue et les titres sont écrits dans le Markdown. Un
 * ticket rédigé en français porte donc « ## Observation », le même ticket rédigé
 * en anglais « ## Observed ». Deux règles rendent cela sûr :
 *
 *  1. LES INTITULÉS SONT GELÉS ICI, jamais lus dans le dictionnaire. Si les
 *     titres provenaient de `t.*`, retoucher une traduction rendrait
 *     illisibles tous les tickets déjà enregistrés. Le dictionnaire ne sert
 *     qu'aux libellés de FORMULAIRE ; le format de stockage appartient à ce
 *     module, et à lui seul.
 *
 *  2. LA RECONNAISSANCE EST INDÉPENDANTE DE LA LANGUE. `ALIASES` liste, pour
 *     chaque rubrique, toutes les formes déjà rencontrées, toutes langues
 *     confondues. N'importe qui peut donc rouvrir, dans n'importe quelle langue,
 *     un ticket rédigé par quelqu'un d'autre.
 *
 *     ⚠ Cette table est en AJOUT SEUL. Modifier ou retirer un alias orpheline
 *     les tickets qui l'utilisaient : ils basculeraient en édition Markdown
 *     brute. Traduire différemment une rubrique = AJOUTER une forme, jamais en
 *     remplacer une.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ALLER-RETOUR SANS PERTE
 *
 * `parseReport` n'accepte de découper une description que s'il peut garantir de
 * la reconstruire à l'identique. Au moindre doute il renvoie `null`, et l'appelant
 * retombe sur l'éditeur Markdown brut : mieux vaut un formulaire indisponible
 * qu'un paragraphe silencieusement effacé.
 */

/** Les quatre rubriques, dans l'ordre où elles sont écrites. */
export const REPORT_SECTIONS = [
  "observation",
  "expected",
  "context",
  "specs",
] as const;

export type ReportSection = (typeof REPORT_SECTIONS)[number];

/**
 * Rubriques obligatoires. `specs` (« Alignement aux spécifications ») en est
 * volontairement absente : toutes les demandes ne se rattachent pas à une
 * spécification, et l'exiger pousserait à écrire « néant » pour passer.
 */
export const REQUIRED_REPORT_SECTIONS = [
  "observation",
  "expected",
  "context",
] as const satisfies readonly ReportSection[];

/** Contenu d'un rapport, rubrique par rubrique. */
export type ReportBody = Record<ReportSection, string>;

/** La rubrique est-elle obligatoire ? (`specs` est la seule à ne pas l'être.) */
export function isRequiredSection(section: ReportSection): boolean {
  return (REQUIRED_REPORT_SECTIONS as readonly ReportSection[]).includes(section);
}

/** Rapport vierge. Fonction, et non constante : chaque formulaire a le sien. */
export function emptyReport(): ReportBody {
  return { observation: "", expected: "", context: "", specs: "" };
}

/**
 * Intitulés ÉCRITS dans le Markdown, par langue. Voir l'en-tête : ils sont gelés
 * ici et n'ont pas de contrepartie dans le dictionnaire.
 *
 * En anglais, « Observed » / « Expected » plutôt que « Observation » /
 * « Expectation » : c'est le couple consacré des outils de suivi anglophones, et
 * il conserve le parallélisme du couple français « Observation » / « Attendu ».
 */
const HEADINGS: Record<Locale, Record<ReportSection, string>> = {
  fr: {
    observation: "Observation",
    expected: "Attendu",
    context: "Contexte",
    specs: "Alignement aux spécifications",
  },
  en: {
    observation: "Observed",
    expected: "Expected",
    context: "Context",
    specs: "Specification alignment",
  },
};

/** Intitulés à écrire pour une langue donnée (français par défaut). */
export function reportHeadings(locale: Locale): Record<ReportSection, string> {
  return HEADINGS[locale] ?? HEADINGS.fr;
}

/**
 * Intitulés français, utilisés dans les messages d'erreur du serveur : comme le
 * reste des messages d'action, ils sont en français quelle que soit la langue de
 * l'interface (cf. `server/actions/helpers.ts`).
 */
export const REPORT_HEADINGS_FR = HEADINGS.fr;

/**
 * Formes reconnues à la relecture, par rubrique. TABLE EN AJOUT SEUL (cf.
 * l'en-tête). Elle contient les intitulés canoniques de chaque langue, plus les
 * variantes que les gens écrivent spontanément à la main.
 */
const ALIASES: Record<ReportSection, readonly string[]> = {
  observation: [
    "Observation",
    "Observations",
    "Constat",
    "Comportement observé",
    "Observed",
    "Observed behaviour",
    "Observed behavior",
    "Actual",
    "Actual behaviour",
    "Actual behavior",
  ],
  expected: [
    "Attendu",
    "Attendus",
    "Résultat attendu",
    "Comportement attendu",
    "Expected",
    "Expected result",
    "Expected behaviour",
    "Expected behavior",
  ],
  context: [
    "Contexte",
    "Context",
    "Environnement",
    "Environment",
  ],
  specs: [
    "Alignement aux spécifications",
    "Alignement aux specs",
    "Alignement spécifications",
    "Alignement",
    "Specification alignment",
    "Specifications alignment",
    "Spec alignment",
    "Alignment with specifications",
  ],
};

/**
 * Ramène un intitulé à une forme comparable : sans accents, sans emphase
 * Markdown, sans deux-points final, en minuscules. Deux personnes écrivant
 * « Attendu », « attendu : » ou « **Attendu** » désignent la même rubrique.
 */
export function normalizeHeading(raw: string): string {
  return raw
    .normalize("NFD")
    // Signes diacritiques isolés par la décomposition NFD : « é » -> « e » + ´.
    .replace(/[̀-ͯ]/g, "")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[:.]+$/, "")
    .trim()
    .toLowerCase();
}

/** Index alias normalisé → rubrique, construit une fois au chargement. */
const SECTION_BY_ALIAS: ReadonlyMap<string, ReportSection> = new Map(
  REPORT_SECTIONS.flatMap((section) =>
    ALIASES[section].map(
      (alias) => [normalizeHeading(alias), section] as const,
    ),
  ),
);

/** Rubrique désignée par un intitulé, toutes langues et variantes confondues. */
export function sectionForHeading(raw: string): ReportSection | null {
  return SECTION_BY_ALIAS.get(normalizeHeading(raw)) ?? null;
}

/** Titre ATX (`## Titre`), avec les fermetures optionnelles (`## Titre ##`). */
const HEADING_RE = /^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/;
/** Ouverture / fermeture d'un bloc de code clôturé. */
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})/;

export interface ParsedReport {
  sections: ReportBody;
  /**
   * Contenu situé APRÈS la dernière rubrique reconnue (une rubrique « Notes »
   * ajoutée à la main, par exemple). Conservé tel quel et réécrit en fin de
   * description : le formulaire structuré ne le montre pas, mais ne le perd pas.
   */
  extra: string;
}

/**
 * Découpe une description en rubriques, ou renvoie `null` si le découpage ne
 * serait pas réversible. Sont refusés :
 *  - une description sans titre reconnu (texte libre ordinaire) ;
 *  - du texte avant la première rubrique (le formulaire n'a nulle part où le
 *    remettre sans le déplacer) ;
 *  - une rubrique en double (on ne saurait laquelle garder) ;
 *  - une rubrique reconnue APRÈS un titre inconnu (la réécriture changerait
 *    l'ordre du document) ;
 *  - l'absence d'une rubrique obligatoire.
 * Les titres situés dans un bloc de code sont ignorés : ce sont des données, pas
 * de la structure.
 */
export function parseReport(
  markdown: string | null | undefined,
): ParsedReport | null {
  const text = (markdown ?? "").replace(/\r\n?/g, "\n");
  if (!text.trim()) return null;

  const lines = text.split("\n");

  // 1. Relever les titres hors blocs de code.
  const heads: Array<{ line: number; section: ReportSection | null }> = [];
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
      heads.push({ line: i, section: sectionForHeading(heading[2]) });
    }
  }

  if (heads.length === 0 || heads[0].section === null) return null;
  // Préambule : du texte avant la première rubrique n'aurait pas de place.
  if (lines.slice(0, heads[0].line).join("\n").trim()) return null;

  const sections = emptyReport();
  const seen = new Set<ReportSection>();
  let extraFrom: number | null = null;

  for (let k = 0; k < heads.length; k += 1) {
    const { line, section } = heads[k];
    if (extraFrom !== null) {
      // On est déjà dans la zone libre : une rubrique reconnue ne peut plus y
      // apparaître sans que la réécriture ne réordonne le document.
      if (section !== null) return null;
      continue;
    }
    if (section === null) {
      extraFrom = line;
      continue;
    }
    if (seen.has(section)) return null;
    seen.add(section);
    const end = heads[k + 1]?.line ?? lines.length;
    sections[section] = lines.slice(line + 1, end).join("\n").trim();
  }

  if (REQUIRED_REPORT_SECTIONS.some((section) => !seen.has(section))) {
    return null;
  }

  return {
    sections,
    extra: extraFrom === null ? "" : lines.slice(extraFrom).join("\n").trim(),
  };
}

/**
 * Réécrit un rapport en Markdown. Les rubriques vides sont omises plutôt
 * qu'écrites en titre orphelin ; c'est `missingReportSections` qui refuse
 * l'enregistrement d'un rapport incomplet, pas la sérialisation.
 */
export function serializeReport(
  body: ReportBody,
  locale: Locale,
  extra?: string | null,
): string {
  const headings = reportHeadings(locale);
  const blocks = REPORT_SECTIONS.flatMap((section) => {
    const value = body[section]?.trim();
    return value ? [`## ${headings[section]}\n\n${value}`] : [];
  });
  const tail = extra?.trim();
  if (tail) blocks.push(tail);
  return blocks.join("\n\n");
}

/** Rubriques obligatoires restées vides. */
export function missingReportSections(body: ReportBody): ReportSection[] {
  return REQUIRED_REPORT_SECTIONS.filter((section) => !body[section]?.trim());
}

export type ReportCheck =
  | { ok: true }
  | { ok: false; missing: readonly ReportSection[] };

/**
 * Contrôle qu'une description brute satisfait le modèle. Porte d'entrée du
 * serveur : elle traite indifféremment une description absente, libre ou
 * structurée mais lacunaire.
 */
export function checkReportDescription(
  markdown: string | null | undefined,
): ReportCheck {
  const parsed = parseReport(markdown);
  // `null` recouvre aussi bien « pas de description » que « description libre » :
  // dans les deux cas, aucune rubrique n'est renseignée.
  if (!parsed) return { ok: false, missing: REQUIRED_REPORT_SECTIONS };
  const missing = missingReportSections(parsed.sections);
  return missing.length === 0 ? { ok: true } : { ok: false, missing };
}

/** Énumération française : « a », « a et b », « a, b et c ». */
function joinFr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? "";
  return `${items.slice(0, -1).join(", ")} et ${items[items.length - 1]}`;
}

/**
 * Message d'erreur du serveur. En français, comme tous les messages remontés par
 * les actions, et nommant les rubriques manquantes plutôt que la règle générale :
 * c'est ce qui reste actionnable une fois le toast affiché.
 */
export function reportRequirementMessage(
  typeName: string,
  missing: readonly ReportSection[],
): string {
  const names = joinFr(
    missing.map((section) => `« ${REPORT_HEADINGS_FR[section]} »`),
  );
  return `Le type « ${typeName} » impose un modèle de ticket : la description doit renseigner ${names}.`;
}
