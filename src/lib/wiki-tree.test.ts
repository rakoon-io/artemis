import { describe, it, expect } from "vitest";
import {
  ancestorsOf,
  descendantIds,
  orderedTree,
  parentOptions,
  type FlatPage,
} from "./wiki-tree";

// Arbre :
//   Guide (g)
//     Installation (i)
//     Usage (u)
//       Avance (a)
//   Reference (r)
const PAGES: FlatPage[] = [
  { id: "u", title: "Usage", parentId: "g" },
  { id: "g", title: "Guide", parentId: null },
  { id: "r", title: "Reference", parentId: null },
  { id: "a", title: "Avance", parentId: "u" },
  { id: "i", title: "Installation", parentId: "g" },
];

describe("orderedTree", () => {
  it("ordonne en DFS, parents avant enfants, freres par titre, avec profondeur", () => {
    const flat = orderedTree(PAGES).map((n) => [n.page.id, n.depth]);
    expect(flat).toEqual([
      ["g", 0],
      ["i", 1], // Installation avant Usage (ordre alphabetique)
      ["u", 1],
      ["a", 2],
      ["r", 0],
    ]);
  });

  it("rattache une page orpheline (parent absent) a la racine sans la perdre", () => {
    const flat = orderedTree([
      { id: "x", title: "Orpheline", parentId: "inconnu" },
    ]);
    expect(flat.map((n) => [n.page.id, n.depth])).toEqual([["x", 0]]);
  });

  it("ne boucle pas sur un cycle et conserve toutes les pages", () => {
    const cyclic: FlatPage[] = [
      { id: "a", title: "A", parentId: "b" },
      { id: "b", title: "B", parentId: "a" },
    ];
    const flat = orderedTree(cyclic);
    expect(new Set(flat.map((n) => n.page.id))).toEqual(new Set(["a", "b"]));
  });
});

describe("descendantIds", () => {
  it("renvoie tous les descendants, la page exclue", () => {
    expect(descendantIds(PAGES, "g")).toEqual(new Set(["i", "u", "a"]));
    expect(descendantIds(PAGES, "u")).toEqual(new Set(["a"]));
    expect(descendantIds(PAGES, "r")).toEqual(new Set());
  });
});

describe("ancestorsOf", () => {
  it("renvoie la chaine racine -> parent direct (fil d'Ariane)", () => {
    expect(ancestorsOf(PAGES, "a").map((p) => p.id)).toEqual(["g", "u"]);
    expect(ancestorsOf(PAGES, "g")).toEqual([]);
  });
});

describe("parentOptions", () => {
  it("exclut la page et ses descendants (empeche un cycle)", () => {
    const ids = parentOptions(PAGES, "g").map((n) => n.page.id);
    expect(ids).toEqual(["r"]); // g, i, u, a exclus
  });

  it("sans exclusion, renvoie tout l'arbre", () => {
    expect(parentOptions(PAGES).length).toBe(PAGES.length);
  });
});
