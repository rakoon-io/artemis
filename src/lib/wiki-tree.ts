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
