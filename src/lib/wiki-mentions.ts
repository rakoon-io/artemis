/**
 * Logique (pure, testable) des mentions « @ » dans l'éditeur de wiki : détection
 * de la mention en cours de frappe et classement des tickets par pertinence.
 * La partie positionnement du curseur (DOM) reste dans le composant.
 */

export interface TicketRef {
  id: string;
  key: string;
  title: string;
  /** Assigné, pour l'infobulle d'une citation. Facultatif : tous les
   * appelants ne le chargent pas. */
  assignee?: { name: string | null; email: string } | null;
}

export interface MentionState {
  start: number;
  query: string;
}

/**
 * Personne citable. Le nom peut manquer (compte créé sans nom) : l'adresse, elle,
 * ne manque jamais, et sert alors d'étiquette.
 */
export interface UserRef {
  id: string;
  name: string | null;
  email: string;
}

/**
 * Ce qu'une mention « @ » peut désigner. Deux natures, une seule liste : le
 * rédacteur tape « @ » et cherche, sans avoir à décider d'abord s'il vise une
 * tâche ou quelqu'un.
 */
export type MentionTarget =
  | { kind: "ticket"; id: string; ticket: TicketRef }
  | { kind: "user"; id: string; user: UserRef };

/** Étiquette d'une personne : son nom, ou à défaut la partie utile de l'adresse. */
export function userLabel(user: UserRef): string {
  const nom = user.name?.trim();
  return nom || user.email.split("@")[0];
}

/**
 * Markdown d'une mention de personne.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI UN LIEN `mailto:` ET NON UN IDENTIFIANT
 *
 * Une mention de TÂCHE s'écrit « @RKN-12 » et se résout à l'affichage contre le
 * catalogue du projet : la clef suffit, elle est courte et parlante. Pour une
 * personne, il n'existe pas d'équivalent court et stable - un identifiant de
 * base serait illisible dans le Markdown, et un simple nom serait ambigu.
 *
 * La mention se suffit donc à elle-même : elle porte le nom affiché ET
 * l'adresse. Trois conséquences qui valaient le choix - elle reste lisible dans
 * le Markdown brut, elle s'affiche partout où du Markdown est rendu sans qu'un
 * seul appelant ait à transmettre une table de correspondance, et elle ne se
 * change pas en texte mort le jour où le compte est supprimé.
 */
export function userMentionMarkdown(user: UserRef): string {
  return `[@${escapeLabel(userLabel(user))}](mailto:${user.email})`;
}

/** Neutralise ce qui refermerait l'étiquette du lien avant l'heure. */
function escapeLabel(s: string): string {
  return s.replace(/([\\\[\]])/g, "\\$1");
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
/**
 * Table des clés de ticket (en MAJUSCULES) vers leur identifiant : c'est elle
 * qui transforme « RKN-12 » en lien lors du rendu.
 */
export function ticketMapOf(tickets: TicketRef[]): Record<string, string> {
  return Object.fromEntries(
    tickets.map((ticket) => [ticket.key.toUpperCase(), ticket.id]),
  );
}

/**
 * Ce que dit l'infobulle d'une citation, indexé par IDENTIFIANT (c'est lui que
 * porte le lien) : de quoi parle le ticket cité, et qui s'en occupe.
 */
export function ticketHintsOf(
  tickets: TicketRef[],
): Record<string, { key: string; title: string; assignee: string | null }> {
  return Object.fromEntries(
    tickets.map((ticket) => [
      ticket.id,
      {
        key: ticket.key,
        title: ticket.title,
        assignee: ticket.assignee?.name ?? ticket.assignee?.email ?? null,
      },
    ]),
  );
}

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
      if (alphaOk && kNum === qNum)
        score = 0; // numéro exact
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

/**
 * Classe ENSEMBLE les tâches et les personnes pour la requête « @… ».
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE SEULE LISTE, UNE SEULE ÉCHELLE DE SCORE
 *
 * Deux listes séparées auraient obligé le rédacteur à choisir sa cible avant de
 * chercher. On mélange donc, en plaçant les deux natures sur la MÊME échelle,
 * dont l'ordre traduit une intention :
 *
 *   0-1   une tâche désignée par son numéro       (« @QUA-5 »)
 *   5     une personne dont le nom commence ainsi (« @Van »)
 *   10    une tâche du projet cherché             (« @QUA »)
 *   20+   ce que la recherche libre ramène        (titre, adresse)
 *
 * Le nom d'une personne passe donc avant un titre de tâche qui contiendrait le
 * même mot, mais après une clef de tâche explicite : taper « @QUA » cherche des
 * tâches, taper « @Van » cherche quelqu'un, et personne n'a rien eu à déclarer.
 */
export function rankMentions(
  tickets: TicketRef[],
  users: UserRef[],
  rawQuery: string,
): MentionTarget[] {
  const q = rawQuery.trim().toLowerCase();

  // Sans requête, la liste doit faire DÉCOUVRIR les deux natures : quelques
  // personnes puis les tâches récentes. N'afficher que des tâches laisserait
  // croire qu'on ne peut citer qu'elles.
  if (!q) {
    const debutUsers = users.slice(0, 3).map(asUserTarget);
    return [
      ...debutUsers,
      ...rankTickets(tickets, "")
        .slice(0, SUGGEST_LIMIT - debutUsers.length)
        .map(asTicketTarget),
    ];
  }

  const scored: { target: MentionTarget; score: number; tie: number }[] = [];

  // Tâches : on réutilise le classement existant, dont l'ordre porte déjà le
  // score. Le rang dans la liste sert de départage.
  rankTickets(tickets, rawQuery).forEach((ticket, rang) => {
    const { alpha: qAlpha, num: qNum } = splitKey(q);
    const { num: kNum } = splitKey(ticket.key);
    const score = qNum
      ? kNum === qNum
        ? 0
        : 1
      : qAlpha && ticket.key.toLowerCase().startsWith(qAlpha)
        ? 10
        : 20;
    scored.push({ target: asTicketTarget(ticket), score, tie: rang });
  });

  users.forEach((user, rang) => {
    const label = userLabel(user).toLowerCase();
    const email = user.email.toLowerCase();
    // Début d'un MOT du nom, et non début du nom seul : on cherche « Silva »
    // aussi souvent que « Vanessa ».
    const prefixe =
      label.split(/[\s.\-_]+/).some((mot) => mot.startsWith(q)) ||
      email.split(/[\s.\-_@]+/).some((mot) => mot.startsWith(q));
    if (prefixe)
      scored.push({ target: asUserTarget(user), score: 5, tie: rang });
    else if (label.includes(q) || email.includes(q)) {
      scored.push({ target: asUserTarget(user), score: 22, tie: rang });
    }
  });

  scored.sort((a, b) => a.score - b.score || a.tie - b.tie);
  return scored.slice(0, SUGGEST_LIMIT).map((s) => s.target);
}

const asTicketTarget = (ticket: TicketRef): MentionTarget => ({
  kind: "ticket",
  id: ticket.id,
  ticket,
});

const asUserTarget = (user: UserRef): MentionTarget => ({
  kind: "user",
  id: user.id,
  user,
});
