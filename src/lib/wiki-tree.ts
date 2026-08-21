/**
 * Logique (pure, testable) de l'arborescence des pages de wiki : construction de
 * l'arbre, aplatissement avec profondeur, ancêtres (fil d'Ariane) et descendants
 * (pour empêcher les cycles lors d'un déplacement).
 */

export interface FlatPage {
  id: string;
  title: string;
  parentId: string | null;
}

export interface TreeNode<T extends FlatPage = FlatPage> {
  page: T;
  depth: number;
}

/**
 * Une page et celles qu'elle abrite. C'est la forme dont a besoin un plan
 * REPLIABLE : la liste aplatie dit la profondeur de chacune, elle ne dit pas
 * lesquelles disparaissent quand on referme un parent.
 */
export interface NestedPage<T extends FlatPage = FlatPage> {
  page: T;
  depth: number;
  children: NestedPage<T>[];
}

/**
 * Le même arbre qu'`orderedTree`, mais EMBOÎTÉ plutôt qu'aplati.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PAR `parentId`, ET NON PAR PROFONDEUR
 *
 * Le sommaire d'un document doit deviner sa hiérarchie à partir des niveaux de
 * titre : c'est tout ce qu'un Markdown lui donne. Un plan de wiki, lui, la
 * CONNAÎT - chaque page nomme sa parente. Reconstruire l'emboîtement à partir
 * de la profondeur affichée serait redériver, avec des approximations, ce que
 * la base énonce déjà.
 *
 * L'ordre et les garde-fous sont ceux d'`orderedTree`, dont cette fonction
 * partage la marche : frères triés par titre, orphelines rattachées à la
 * racine, cycles neutralisés. Les deux fonctions doivent rendre les mêmes
 * pages dans le même ordre - c'est vérifié par un test.
 */
export function nestedTree<T extends FlatPage>(pages: T[]): NestedPage<T>[] {
  const childrenOf = new Map<string | null, T[]>();
  const ids = new Set(pages.map((p) => p.id));
  for (const page of pages) {
    const key = page.parentId && ids.has(page.parentId) ? page.parentId : null;
    const list = childrenOf.get(key) ?? [];
    list.push(page);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) list.sort(byTitle);

  const visited = new Set<string>();
  const build = (parentKey: string | null, depth: number): NestedPage<T>[] => {
    const out: NestedPage<T>[] = [];
    for (const page of childrenOf.get(parentKey) ?? []) {
      if (visited.has(page.id)) continue; // garde-fou anti-cycle
      visited.add(page.id);
      out.push({ page, depth, children: build(page.id, depth + 1) });
    }
    return out;
  };

  const racines = build(null, 0);
  // Filet de sécurité : une page prise dans un cycle n'a pas été visitée et
  // disparaîtrait du plan. On la rattache à la racine plutôt que de la perdre.
  for (const page of pages) {
    if (!visited.has(page.id)) {
      visited.add(page.id);
      racines.push({ page, depth: 0, children: [] });
    }
  }
  return racines;
}

/** Identifiants des pages qui en abritent d'autres - les seules repliables. */
export function foldablePageIds<T extends FlatPage>(
  nodes: readonly NestedPage<T>[],
): string[] {
  const out: string[] = [];
  const walk = (liste: readonly NestedPage<T>[]) => {
    for (const n of liste) {
      if (n.children.length > 0) {
        out.push(n.page.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

/**
 * Identifiants des ancêtres d'une page, elle exclue - ceux qu'il faut garder
 * OUVERTS pour que la page reste visible dans le plan.
 *
 * Sans cela, replier un parent escamoterait la page qu'on est en train de lire,
 * et l'on perdrait le seul repère qui dit où l'on se trouve.
 */
export function ancestorIds(pages: FlatPage[], id: string): Set<string> {
  return new Set(ancestorsOf(pages, id).map((page) => page.id));
}

/** Compare deux titres pour un ordre stable (insensible à la casse/accents). */
function byTitle(a: FlatPage, b: FlatPage): number {
  return a.title.localeCompare(b.title, "fr", { sensitivity: "base" });
}

/**
 * Aplatit les pages en un arbre ordonné (DFS) : chaque parent précède ses enfants,
 * les frères sont triés par titre, et la profondeur est annotée pour l'indentation.
 * Robuste : les pages orphelines (parent absent) et d'éventuels cycles sont traités
 * comme des racines afin qu'aucune page ne disparaisse.
 */
export function orderedTree<T extends FlatPage>(pages: T[]): TreeNode<T>[] {
  const childrenOf = new Map<string | null, T[]>();
  const ids = new Set(pages.map((p) => p.id));
  for (const page of pages) {
    // Un parent inexistant -> rattaché à la racine.
    const key = page.parentId && ids.has(page.parentId) ? page.parentId : null;
    const list = childrenOf.get(key) ?? [];
    list.push(page);
    childrenOf.set(key, list);
  }
  for (const list of childrenOf.values()) list.sort(byTitle);

  const out: TreeNode<T>[] = [];
  const visited = new Set<string>();
  const walk = (parentKey: string | null, depth: number) => {
    for (const page of childrenOf.get(parentKey) ?? []) {
      if (visited.has(page.id)) continue; // garde-fou anti-cycle
      visited.add(page.id);
      out.push({ page, depth });
      walk(page.id, depth + 1);
    }
  };
  walk(null, 0);
  // Filet de sécurité : rattache toute page non visitée (cycle) à la racine.
  for (const page of pages) {
    if (!visited.has(page.id)) {
      visited.add(page.id);
      out.push({ page, depth: 0 });
    }
  }
  return out;
}

/** Identifiants des descendants d'une page (elle-même exclue). */
export function descendantIds(pages: FlatPage[], id: string): Set<string> {
  const childrenOf = new Map<string, FlatPage[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const list = childrenOf.get(page.parentId) ?? [];
    list.push(page);
    childrenOf.set(page.parentId, list);
  }
  const out = new Set<string>();
  const stack = [...(childrenOf.get(id) ?? [])];
  while (stack.length) {
    const page = stack.pop()!;
    if (out.has(page.id)) continue;
    out.add(page.id);
    stack.push(...(childrenOf.get(page.id) ?? []));
  }
  return out;
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SOUS-ARBRE, DANS L'ORDRE DE LECTURE
 *
 * Cette fonction s'appelait `specSubtree` et vivait dans `spec-package.ts`.
 * Elle n'a pourtant jamais rien su des spécifications : elle marche sur des
 * `FlatPage`, comme tout ce fichier. Le nom venait de son premier appelant.
 *
 * Elle en a désormais deux - le gel d'une version publiée, et l'export d'une
 * page avec ses sous-pages -, et rien n'aurait été plus trompeur qu'un export
 * de wiki important « specSubtree ». Le déplacement supprime au passage un
 * comparateur de titres recopié à l'identique dans les deux fichiers : l'ordre
 * d'un document publié et celui du plan ne peuvent plus diverger, puisqu'il n'y
 * a plus qu'une comparaison.
 * ────────────────────────────────────────────────────────────────────────── */

export interface ReadingEntry<T extends FlatPage = FlatPage> {
  page: T;
  /** Rang dans l'ordre de lecture, à partir de zéro. */
  order: number;
  /** Chemin lisible depuis la racine, incluse (« Spéc / Champs »). */
  path: string;
  /** Profondeur relative à la racine (0 pour la racine elle-même). */
  depth: number;
}

/** Séparateur de chemin, choisi lisible plutôt que technique. */
export const PATH_SEPARATOR = " / ";

/**
 * Pages du sous-arbre ancré sur `rootId`, dans l'ordre de lecture, avec leur
 * chemin. La RACINE EST INCLUSE, en première position et à la profondeur zéro :
 * un document commence par sa page de garde.
 *
 * Renvoie un tableau vide si la racine n'existe pas.
 *
 * Le garde-fou `visited` protège d'un cycle parent/enfant : la base l'interdit
 * en pratique (l'action anti-cycle du wiki), mais une boucle ferait ici une
 * récursion infinie au lieu d'un simple résultat tronqué.
 */
export function readingOrder<T extends FlatPage>(
  pages: T[],
  rootId: string,
): ReadingEntry<T>[] {
  const root = pages.find((page) => page.id === rootId);
  if (!root) return [];

  const childrenOf = new Map<string, T[]>();
  for (const page of pages) {
    if (!page.parentId) continue;
    const siblings = childrenOf.get(page.parentId);
    if (siblings) siblings.push(page);
    else childrenOf.set(page.parentId, [page]);
  }
  for (const siblings of childrenOf.values()) siblings.sort(byTitle);

  const entries: ReadingEntry<T>[] = [];
  const visited = new Set<string>();

  const walk = (page: T, depth: number, trail: string[]): void => {
    if (visited.has(page.id)) return;
    visited.add(page.id);
    const path = [...trail, page.title];
    entries.push({ page, order: entries.length, path: path.join(PATH_SEPARATOR), depth });
    for (const child of childrenOf.get(page.id) ?? []) {
      walk(child, depth + 1, path);
    }
  };

  walk(root, 0, []);
  return entries;
}

/** Chaîne d'ancêtres d'une page, de la racine jusqu'à son parent direct (fil d'Ariane). */
export function ancestorsOf<T extends FlatPage>(pages: T[], id: string): T[] {
  const byId = new Map(pages.map((p) => [p.id, p]));
  const chain: T[] = [];
  const seen = new Set<string>();
  let current = byId.get(id)?.parentId ?? null;
  while (current && byId.has(current) && !seen.has(current)) {
    seen.add(current);
    const page = byId.get(current)!;
    chain.unshift(page);
    current = page.parentId;
  }
  return chain;
}

/**
 * Options de page parente pour un formulaire : l'arbre aplati privé de la page
 * elle-même et de ses descendants (déplacer une page sous un de ses descendants
 * créerait un cycle).
 */
export function parentOptions<T extends FlatPage>(
  pages: T[],
  excludeId?: string,
): TreeNode<T>[] {
  const excluded = excludeId
    ? new Set<string>([excludeId, ...descendantIds(pages, excludeId)])
    : new Set<string>();
  return orderedTree(pages).filter((n) => !excluded.has(n.page.id));
}

/* ─────────────────────────────────────────────────────────────────────────────
 * SECTIONS PRÉDÉFINIES
 *
 * Une section est une page racine ; l'appartenance des autres pages ne se stocke
 * nulle part, elle se lit dans l'arbre. Ces fonctions sont la seule définition
 * de cette lecture : tout le reste de l'application les appelle plutôt que de
 * refaire le parcours, où il divergerait.
 * ────────────────────────────────────────────────────────────────────────── */

/** Racine d'une section, telle que la désigne `WikiSection`. */
export interface SectionRoot<K extends string = string> {
  kind: K;
  rootPageId: string;
}

/**
 * Section d'une page : la première racine rencontrée en remontant ses ancêtres,
 * ELLE-MÊME COMPRISE - la page « Réunions » appartient aux réunions.
 *
 * Renvoie `null` pour une page libre. C'est un cas NORMAL et non un défaut à
 * réparer : le wiki ne force personne à classer, et une page qui n'entre dans
 * aucune des trois cases doit rester visible plutôt que disparaître dans une
 * catégorie qui ne la décrit pas.
 *
 * En cas de sections imbriquées - possible, rien ne l'interdit -, c'est la PLUS
 * PROCHE qui l'emporte : une page rangée sous « Réunions », elle-même posée par
 * mégarde sous « Implémentation », est une réunion.
 */
export function sectionOfPage<K extends string>(
  pages: FlatPage[],
  sections: ReadonlyArray<SectionRoot<K>>,
  pageId: string,
): K | null {
  if (sections.length === 0) return null;
  const kindByRoot = new Map(sections.map((s) => [s.rootPageId, s.kind]));
  const byId = new Map(pages.map((p) => [p.id, p]));

  // `seen` : un cycle dans l'arbre ne doit pas figer l'affichage d'une page.
  const seen = new Set<string>();
  let current: string | null = pageId;
  while (current && !seen.has(current)) {
    const kind = kindByRoot.get(current);
    if (kind !== undefined) return kind;
    seen.add(current);
    current = byId.get(current)?.parentId ?? null;
  }
  return null;
}

/**
 * Range l'arbre PAR SECTION, dans l'ordre donné, puis les pages libres.
 *
 * Les pages libres sont rendues à part et JAMAIS masquées : une taxonomie qui
 * avale ce qui n'y entre pas est pire que pas de taxonomie. Elles se voient, et
 * l'on décide de les ranger - ou non.
 */
export function groupBySection<T extends FlatPage, K extends string>(
  pages: T[],
  sections: ReadonlyArray<SectionRoot<K>>,
  order: ReadonlyArray<K>,
): {
  sections: Array<{ kind: K; rootPageId: string; nodes: TreeNode<T>[] }>;
  loose: TreeNode<T>[];
} {
  const tree = orderedTree(pages);
  const of = new Map(
    tree.map((node) => [node.page.id, sectionOfPage(pages, sections, node.page.id)]),
  );
  const rootById = new Map(sections.map((s) => [s.kind, s.rootPageId]));

  // La profondeur est REBASÉE sur la racine de section : dans le plan, une
  // section est un titre, pas une page à indenter. Sans ce décalage, tout son
  // contenu commencerait au premier cran, et l'on perdrait un niveau de lecture
  // sur toute la colonne.
  const grouped = order
    .filter((kind) => rootById.has(kind))
    .map((kind) => ({
      kind,
      rootPageId: rootById.get(kind)!,
      nodes: tree
        .filter(
          (node) => of.get(node.page.id) === kind && node.page.id !== rootById.get(kind),
        )
        .map((node) => ({ ...node, depth: Math.max(0, node.depth - 1) })),
    }));

  return {
    sections: grouped,
    loose: tree.filter((node) => of.get(node.page.id) === null),
  };
}
