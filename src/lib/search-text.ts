/**
 * RECHERCHE PLEIN TEXTE - normalisation, découpage en termes, extraits et
 * surlignage (module pur, testable isolément : voir search-text.test.ts).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI NORMALISER NOUS-MÊMES
 *
 * On aurait pu confier les accents à PostgreSQL. Mesure faite sur la base : la
 * configuration `french` ne les replie PAS de façon fiable - « réunion » et
 * « reunion » produisent deux lexèmes distincts (9 cas sur 12 testés). Il aurait
 * donc fallu l'extension `unaccent`, c'est-à-dire un `CREATE EXTENSION` à jouer
 * sur chaque base, y compris celles où l'on n'a pas les droits.
 *
 * On replie donc ici, en TypeScript, des DEUX côtés : le texte indexé et la
 * requête passent par la même fonction. Aucune extension, aucun risque de
 * divergence entre deux implémentations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE REPLI PRÉSERVE LES POSITIONS
 *
 * `foldForIndex` renvoie une chaîne de MÊME LONGUEUR que l'entrée : chaque unité
 * de code en produit exactement une. C'est ce qui permet de chercher dans le
 * texte replié puis de découper l'extrait dans le texte D'ORIGINE, aux mêmes
 * indices - donc de restituer les accents et la casse à l'affichage. Une
 * décomposition NFD ordinaire changerait la longueur et décalerait tout.
 */

/** Nombre maximal de termes retenus : au-delà, la requête n'affine plus rien. */
export const MAX_SEARCH_TERMS = 8;
/** Caractères conservés de part et d'autre du terme trouvé, dans un extrait. */
export const SNIPPET_RADIUS = 80;

/**
 * Replie un texte pour la comparaison : sans accents, en minuscules, SANS
 * changer la longueur (cf. l'en-tête). Le résultat n'est pas destiné à être lu.
 */
export function foldForIndex(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    // On prend la lettre de base de la décomposition, puis on abaisse la casse ;
    // si l'une ou l'autre opération ne rend pas exactement un caractère (cas
    // rares comme « İ »), on garde l'original pour ne pas décaler les indices.
    const base = ch.normalize("NFD")[0] ?? ch;
    const lowered = base.toLowerCase();
    out += lowered.length === 1 ? lowered : ch;
  }
  return out;
}

/**
 * Texte à indexer pour une page : titre et contenu repliés. Le titre est répété
 * en tête - c'est l'astuce la plus simple pour qu'une page dont le TITRE
 * contient le mot cherché remonte avant celles qui ne l'ont que dans le corps.
 */
export function buildSearchText(title: string, content: string): string {
  return foldForIndex(`${title}\n${title}\n${content}`);
}

/**
 * Découpe une requête en termes comparables. Tout ce qui n'est ni lettre ni
 * chiffre sépare : l'utilisateur n'a pas à connaître de syntaxe, et la ponctuation
 * qu'il tape ne doit jamais faire échouer sa recherche.
 */
export function searchTerms(query: string): string[] {
  return foldForIndex(query)
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 0)
    .slice(0, MAX_SEARCH_TERMS);
}

/**
 * Requête `tsquery` en préfixe : « recrut » trouve « recrutement ». Les termes
 * sont liés par ET, donc l'ORDRE des mots n'a plus d'importance - c'était l'un
 * des deux vrais défauts de la recherche précédente.
 *
 * Les termes ne contiennent que des lettres ASCII et des chiffres (garanti par
 * `searchTerms`) : rien qui puisse être interprété par `to_tsquery`.
 */
export function toPrefixQuery(terms: readonly string[]): string {
  return terms.map((term) => `${term}:*`).join(" & ");
}

export interface Snippet {
  /** Extrait tiré du texte D'ORIGINE, accents et casse compris. */
  text: string;
  /** L'extrait commence-t-il avant le début du document ? (affiche « … ») */
  truncatedStart: boolean;
  truncatedEnd: boolean;
}

/**
 * Extrait centré sur la PREMIÈRE occurrence d'un des termes. À défaut
 * d'occurrence - le mot n'est présent que dans le titre, par exemple - on rend
 * le début du document, ce qui reste plus utile qu'un extrait vide.
 */
export function buildSnippet(
  content: string,
  terms: readonly string[],
  radius: number = SNIPPET_RADIUS,
): Snippet {
  // Les blancs sont aplatis d'abord : un extrait tiré d'un Markdown multiligne
  // serait illisible autrement. L'aplatissement conserve la longueur (une
  // espace pour chaque blanc), les indices restent donc valides.
  const flat = content.replace(/\s/g, " ").trim();
  if (!flat) return { text: "", truncatedStart: false, truncatedEnd: false };

  const folded = foldForIndex(flat);
  const hit = terms
    .map((term) => folded.indexOf(term))
    .filter((index) => index >= 0)
    .sort((a, b) => a - b)[0];

  if (hit === undefined) {
    const text = flat.slice(0, radius * 2);
    return {
      text,
      truncatedStart: false,
      truncatedEnd: flat.length > text.length,
    };
  }

  const start = Math.max(0, hit - radius);
  const end = Math.min(flat.length, hit + radius);
  return {
    text: flat.slice(start, end),
    truncatedStart: start > 0,
    truncatedEnd: end < flat.length,
  };
}

/** Un morceau d'extrait, surligné ou non. */
export interface Segment {
  text: string;
  match: boolean;
}

/**
 * Découpe un extrait en segments surlignés et non surlignés. Rendu comme une
 * LISTE et non comme du HTML : le texte reste du texte, il n'y a donc rien à
 * échapper et aucune injection possible depuis le contenu d'une page.
 */
export function highlightSegments(
  text: string,
  terms: readonly string[],
): Segment[] {
  if (!text || terms.length === 0) return [{ text, match: false }];
  const folded = foldForIndex(text);

  // On relève toutes les occurrences, puis on fusionne celles qui se recouvrent
  // (« export » et « exports » sur la même position) pour ne pas couper au
  // milieu d'un mot surligné.
  const spans: Array<[number, number]> = [];
  for (const term of terms) {
    let from = 0;
    for (;;) {
      const index = folded.indexOf(term, from);
      if (index < 0) break;
      spans.push([index, index + term.length]);
      from = index + 1;
    }
  }
  if (spans.length === 0) return [{ text, match: false }];
  spans.sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: Array<[number, number]> = [];
  for (const span of spans) {
    const last = merged[merged.length - 1];
    if (last && span[0] <= last[1]) last[1] = Math.max(last[1], span[1]);
    else merged.push([...span]);
  }

  const segments: Segment[] = [];
  let cursor = 0;
  for (const [start, end] of merged) {
    if (start > cursor) {
      segments.push({ text: text.slice(cursor, start), match: false });
    }
    segments.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), match: false });
  }
  return segments;
}
