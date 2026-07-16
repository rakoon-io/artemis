/**
 * Logique (pure, testable) des mentions « @ » dans l'éditeur de wiki : détection
 * de la mention en cours de frappe et classement des tickets par pertinence.
 * La partie positionnement du curseur (DOM) reste dans le composant.
 */

export interface TicketRef {
  id: string;
  key: string;
  title: string;
}

export interface MentionState {
  start: number;
  query: string;
}

/** Détecte une mention « @… » en cours de frappe autour du curseur. */
export function detectMention(
  value: string,
  caret: number,
): MentionState | null {
  let i = caret;
  while (i > 0 && /[A-Za-z0-9-]/.test(value[i - 1])) i--;
  if (i === 0 || value[i - 1] !== "@") return null;
  const atPos = i - 1;
  // Le « @ » doit débuter un mot (précédé d'un espace, d'une ponctuation, ou du début).
  if (atPos > 0 && /[A-Za-z0-9]/.test(value[atPos - 1])) return null;
  return { start: atPos, query: value.slice(i, caret) };
}

/** Découpe une clé ou une requête en préfixe alphabétique + numéro (« rkn-3 » -> {alpha:"rkn", num:"3"}). */
export function splitKey(s: string): { alpha: string; num: string } {
  const m = s.toLowerCase().match(/^([a-z]*)[^a-z0-9]*(\d*)$/);
  return { alpha: m?.[1] ?? "", num: m?.[2] ?? "" };
}

export const SUGGEST_LIMIT = 8;

/**
 * Classe les tickets par pertinence pour la requête « @… ». La liste s'affine à
 * mesure qu'on tape le numéro : numéro exact d'abord, puis préfixe de numéro
 * (RKN-3 avant RKN-30), puis préfixe de projet, puis recherche libre dans le titre.
 */
export function rankTickets(
  tickets: TicketRef[],
  rawQuery: string,
): TicketRef[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return tickets.slice(0, SUGGEST_LIMIT); // liste récente (numéro décroissant)

  const { alpha: qAlpha, num: qNum } = splitKey(q);
  const scored: { t: TicketRef; score: number; num: number }[] = [];

  for (const t of tickets) {
    const key = t.key.toLowerCase();
    const title = t.title.toLowerCase();
    const { alpha: kAlpha, num: kNum } = splitKey(t.key);
    const alphaOk = !qAlpha || kAlpha.startsWith(qAlpha);
    let score: number | null = null;

    if (qNum) {
      // Un numéro est saisi : on filtre par numéro (préfixe de projet optionnel).
      if (alphaOk && kNum === qNum) score = 0; // numéro exact
      else if (alphaOk && kNum.startsWith(qNum)) score = 1; // préfixe de numéro
    } else if (qAlpha && kAlpha.startsWith(qAlpha)) {
      score = 10; // seulement des lettres : préfixe de projet
    }
    // Repli : recherche libre dans le titre (et dans la clé si aucun numéro saisi).
    if (score === null) {
      if (title.includes(q)) score = 20;
      else if (!qNum && key.includes(q)) score = 25;
    }

    if (score !== null) scored.push({ t, score, num: Number(kNum) || 0 });
  }

  scored.sort((a, b) => a.score - b.score || b.num - a.num);
  return scored.slice(0, SUGGEST_LIMIT).map((s) => s.t);
}
