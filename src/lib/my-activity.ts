import { isTicketDone } from "./release-progress";

/**
 * MON ACTIVITÉ - ce que j'ai sur les bras, logique pure (aucun accès base,
 * aucune horloge : l'instant n'est jamais lu ici, tout est déduit des données).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUATRE CATÉGORIES, UNE SEULE PAR ÉLÉMENT
 *
 * L'activité mêle deux natures d'objets - des tickets qui me sont assignés, et
 * des pages de wiki où l'on me cite. Chaque élément tombe dans EXACTEMENT une
 * catégorie, ce qui fait de l'ensemble une partition : on peut donc l'empiler
 * dans une barre unique sans mentir sur les proportions.
 *
 * Les trois états d'un ticket sont déduits du RANG des colonnes, jamais de leur
 * nom - même règle que `release-progress`, pour la même raison : un projet
 * renomme ses colonnes, les traduit, en ajoute.
 *
 *   - `done`  : la dernière colonne est atteinte (règle commune `isTicketDone`) ;
 *   - `todo`  : le ticket n'a pas bougé de la colonne d'entrée (le plus petit
 *               rang) - il m'est assigné, mais rien n'est commencé ;
 *   - `doing` : tout le reste, c'est-à-dire sorti de l'entrée sans avoir atteint
 *               la fin - le travail engagé ;
 *   - `wiki`  : une page où mon nom est cité. Ce n'est pas un état d'avancement
 *               mais une sollicitation : quelqu'un attend quelque chose de moi.
 *
 * Le découpage des tickets est GROSSIER par construction, et c'est assumé :
 * entre l'entrée et la fin, un projet peut aligner « À faire », « En cours »,
 * « En revue ». L'affichage rattrape la nuance en montrant, sur chaque ligne, le
 * nom réel de la colonne - le regroupement situe, le libellé précise.
 *
 * Cas limite : un projet d'UNE seule colonne a `first === last`. `done` est
 * évalué en premier, tout y est donc terminé - le seul verdict cohérent quand
 * l'entrée est aussi la sortie.
 */

/** Les trois états d'un ticket vu depuis l'accueil. */
export type ActivityState = "todo" | "doing" | "done";

/** Les quatre catégories de la barre : les états, plus les citations. */
export type ActivityCategory = ActivityState | "wiki";

/** L'ordre d'affichage, du plus « à faire » au plus « annexe ». FIXE. */
export const ACTIVITY_CATEGORIES: readonly ActivityCategory[] = [
  "todo",
  "doing",
  "done",
  "wiki",
] as const;

/**
 * COULEURS DE LA BARRE - une teinte par catégorie, dans l'ordre ci-dessus.
 *
 * Ces quatre valeurs ne sont pas choisies à l'œil : elles ont été VALIDÉES par
 * le calcul (écart perceptuel OKLab sous simulation protanope/deutéranope,
 * bande de clarté, plancher de chroma, contraste sur le fond) contre la surface
 * claire ET contre les quatre surfaces sombres du thème. Le pire écart entre
 * deux catégories voisines vaut ΔE 10,1 - au-dessus de la cible de 8.
 *
 * La MÊME valeur sert en clair et en sombre : ce n'est pas un oubli de variante,
 * c'est le résultat de la validation - ces quatre teintes tiennent dans la bande
 * de clarté des deux modes, ce qui est justement ce qu'on cherche quand huit
 * palettes doivent partager un seul jeu de couleurs.
 *
 * `emerald` pour « terminé » n'est pas négociable : c'est déjà la couleur de
 * l'achevé partout ailleurs (versions, sprints). Le reste s'est ajusté autour.
 *
 * Le texte, lui, ne porte JAMAIS ces couleurs (illisible sur certaines
 * palettes) : l'identité passe par la pastille posée à côté du libellé.
 */
export const ACTIVITY_COLORS: Record<ActivityCategory, string> = {
  todo: "#0284c7", // sky-600
  doing: "#ea580c", // orange-600
  done: "#059669", // emerald-600
  wiki: "#7c3aed", // violet-600
};

/** Rangs extrêmes des colonnes d'un projet : l'entrée et la fin du workflow. */
export interface ColumnBounds {
  first: number;
  last: number;
}

/** Où en est ce ticket, au sens des trois états ci-dessus. */
export function ticketActivityState(
  ticket: { column: { order: number } },
  bounds: ColumnBounds,
): ActivityState {
  if (isTicketDone(ticket, bounds.last)) return "done";
  return ticket.column.order > bounds.first ? "doing" : "todo";
}

// ─────────────────────────────────────────────────────────────────────────────
// CITATIONS DANS LE WIKI
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Une citation de personne est un simple lien Markdown `[@Nom](mailto:adresse)`
 * (cf. `wiki-mentions`), rien de plus : aucune table ne l'enregistre, le seul
 * identifiant porté par le document est l'ADRESSE - et elle est unique en base.
 *
 * `mentionNeedle` donne le fragment à chercher en base (filtre large, qui rate
 * peu), `mentionsEmail` tranche ensuite exactement. Les deux sont nécessaires :
 * une recherche par sous-chaîne seule confondrait `bob@x.io` avec
 * `bob@x.io.uk`, dont la première est un préfixe.
 */
export function mentionNeedle(email: string): string {
  return `mailto:${email.trim().toLowerCase()}`;
}

/** Neutralise ce qui, dans une adresse, aurait un sens en expression régulière. */
function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Cette page cite-t-elle vraiment cette personne ?
 *
 * L'adresse doit être suivie d'un caractère qui ne peut pas appartenir à une
 * adresse : c'est ce qui distingue `mailto:bob@x.io)` de `mailto:bob@x.io.uk)`.
 */
export function mentionsEmail(content: string, email: string): boolean {
  const cible = email.trim().toLowerCase();
  if (!cible) return false;
  const re = new RegExp(
    `mailto:${escapeRegExp(cible)}(?![A-Za-z0-9._%+-])`,
    "i",
  );
  return re.test(content);
}

// ─────────────────────────────────────────────────────────────────────────────
// LA CHRONOLOGIE
// ─────────────────────────────────────────────────────────────────────────────

/** Un ticket, tel que la chronologie le montre. */
export interface TicketEntry {
  kind: "ticket";
  category: ActivityState;
  id: string;
  key: string;
  title: string;
  /** Nom réel de la colonne : ce que le regroupement, plus grossier, a perdu. */
  status: string;
  projectKey: string;
  at: Date;
}

/** Une page de wiki où l'on est cité. */
export interface WikiEntry {
  kind: "wiki";
  category: "wiki";
  id: string;
  title: string;
  projectKey: string;
  /** Ce que l'URL du wiki attend : le slug courant, ou l'identifiant à défaut. */
  handle: string;
  at: Date;
}

export type ActivityEntry = TicketEntry | WikiEntry;

/** Combien d'éléments dans chaque catégorie, et en tout. */
export type ActivityCounts = Record<ActivityCategory, number> & {
  total: number;
};

export interface Activity {
  counts: ActivityCounts;
  /** Tout, mêlé, du plus récemment touché au plus ancien. */
  entries: ActivityEntry[];
}

/** Ce que la couche base fournit pour un ticket assigné. */
export interface TicketSource {
  id: string;
  key: string;
  title: string;
  projectId: string;
  updatedAt: Date;
  project: { key: string };
  column: { name: string; order: number };
}

/** Ce que la couche base fournit pour une page citant la personne. */
export interface WikiSource {
  id: string;
  title: string;
  slug: string | null;
  updatedAt: Date;
  project: { key: string };
}

/**
 * Assemble la chronologie et ses comptes.
 *
 * Le tri est fait UNE fois, sur l'ensemble mêlé : c'est tout l'intérêt d'une
 * chronologie unique - « ce qui a bougé en dernier » ne se répond pas par nature
 * d'objet. Le tri est stable et déterministe : à date égale, on départage par
 * identifiant, sans quoi deux rendus successifs pourraient différer.
 *
 * Un ticket dont le projet n'a aucune colonne connue est ignoré : sans rang de
 * référence, on ne saurait pas le situer, et l'inventer le rangerait au hasard.
 */
export function buildActivity(
  tickets: readonly TicketSource[],
  boundsByProject: ReadonlyMap<string, ColumnBounds>,
  wikiPages: readonly WikiSource[],
): Activity {
  const entries: ActivityEntry[] = [];
  const counts: ActivityCounts = {
    todo: 0,
    doing: 0,
    done: 0,
    wiki: 0,
    total: 0,
  };

  for (const ticket of tickets) {
    const bounds = boundsByProject.get(ticket.projectId);
    if (!bounds) continue;
    const category = ticketActivityState(ticket, bounds);
    counts[category] += 1;
    entries.push({
      kind: "ticket",
      category,
      id: ticket.id,
      key: ticket.key,
      title: ticket.title,
      status: ticket.column.name,
      projectKey: ticket.project.key,
      at: ticket.updatedAt,
    });
  }

  for (const page of wikiPages) {
    counts.wiki += 1;
    entries.push({
      kind: "wiki",
      category: "wiki",
      id: page.id,
      title: page.title,
      projectKey: page.project.key,
      handle: page.slug ?? page.id,
      at: page.updatedAt,
    });
  }

  counts.total = counts.todo + counts.doing + counts.done + counts.wiki;
  entries.sort(
    (a, b) => b.at.getTime() - a.at.getTime() || a.id.localeCompare(b.id),
  );
  return { counts, entries };
}

/** Une activité vide - de quoi répondre sans interroger la base. */
export function emptyActivity(): Activity {
  return {
    counts: { todo: 0, doing: 0, done: 0, wiki: 0, total: 0 },
    entries: [],
  };
}
