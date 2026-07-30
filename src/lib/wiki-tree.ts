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
