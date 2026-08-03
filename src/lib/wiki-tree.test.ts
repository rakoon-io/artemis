import { describe, it, expect } from "vitest";
import {
  ancestorsOf,
  descendantIds,
  groupBySection,
  orderedTree,
  parentOptions,
  sectionOfPage,
  readingOrder,
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

describe("sections prédéfinies", () => {
  // Plan : Réunions > CR du 3 mars ; Spécifications > Facturation > Remises ;
  // et « Notes libres », qui n'appartient à rien.
  const PAGES: FlatPage[] = [
    { id: "reunions", title: "Réunions", parentId: null },
    { id: "cr1", title: "CR du 3 mars", parentId: "reunions" },
    { id: "specs", title: "Spécifications", parentId: null },
    { id: "facturation", title: "Facturation", parentId: "specs" },
    { id: "remises", title: "Remises", parentId: "facturation" },
    { id: "libre", title: "Notes libres", parentId: null },
  ];
  const SECTIONS = [
    { kind: "MEETING" as const, rootPageId: "reunions" },
    { kind: "SPEC" as const, rootPageId: "specs" },
  ];

  it("la racine appartient à sa propre section", () => {
    expect(sectionOfPage(PAGES, SECTIONS, "reunions")).toBe("MEETING");
  });

  it("un enfant direct hérite de la section", () => {
    expect(sectionOfPage(PAGES, SECTIONS, "cr1")).toBe("MEETING");
  });

  it("un descendant lointain aussi", () => {
    expect(sectionOfPage(PAGES, SECTIONS, "remises")).toBe("SPEC");
  });

  it("une page libre n'appartient à aucune section, et ce n'est pas un défaut", () => {
    expect(sectionOfPage(PAGES, SECTIONS, "libre")).toBeNull();
  });

  it("sans section déclarée, tout est libre", () => {
    expect(sectionOfPage(PAGES, [], "cr1")).toBeNull();
  });

  it("la section la plus proche l'emporte sur celle qui l'englobe", () => {
    // « Réunions » rangée par mégarde sous « Implémentation » : son contenu
    // reste des réunions.
    const imbrique: FlatPage[] = [
      { id: "impl", title: "Implémentation", parentId: null },
      { id: "reunions", title: "Réunions", parentId: "impl" },
      { id: "cr1", title: "CR", parentId: "reunions" },
    ];
    const sections = [
      { kind: "IMPLEMENTATION" as const, rootPageId: "impl" },
      { kind: "MEETING" as const, rootPageId: "reunions" },
    ];
    expect(sectionOfPage(imbrique, sections, "cr1")).toBe("MEETING");
  });

  it("un cycle ne fige pas la résolution", () => {
    const cycle: FlatPage[] = [
      { id: "a", title: "A", parentId: "b" },
      { id: "b", title: "B", parentId: "a" },
    ];
    expect(sectionOfPage(cycle, SECTIONS, "a")).toBeNull();
  });

  it("une racine déclarée mais absente des pages ne fait rien planter", () => {
    const fantome = [{ kind: "SPEC" as const, rootPageId: "disparue" }];
    expect(sectionOfPage(PAGES, fantome, "libre")).toBeNull();
  });

  it("groupBySection range chaque page sous sa section, dans l'ordre demandé", () => {
    const { sections, loose } = groupBySection(PAGES, SECTIONS, [
      "SPEC",
      "MEETING",
    ]);
    expect(sections.map((s) => s.kind)).toEqual(["SPEC", "MEETING"]);
    expect(sections[0].nodes.map((n) => n.page.id)).toEqual([
      "facturation",
      "remises",
    ]);
    expect(sections[1].nodes.map((n) => n.page.id)).toEqual(["cr1"]);
    // La page libre reste VISIBLE, à part.
    expect(loose.map((n) => n.page.id)).toEqual(["libre"]);
  });

  it("la racine de section ne figure pas dans son propre contenu", () => {
    const { sections } = groupBySection(PAGES, SECTIONS, ["MEETING"]);
    expect(sections[0].nodes.map((n) => n.page.id)).not.toContain("reunions");
  });

  it("la profondeur est rebasée : le contenu d'une section part du premier cran", () => {
    const { sections } = groupBySection(PAGES, SECTIONS, ["SPEC"]);
    expect(sections[0].nodes.map((n) => n.depth)).toEqual([0, 1]);
  });

  it("une section déclarée sans racine connue est ignorée, pas rendue vide", () => {
    const { sections } = groupBySection(PAGES, SECTIONS, [
      "SPEC",
      "IMPLEMENTATION" as "SPEC",
    ]);
    expect(sections.map((s) => s.kind)).toEqual(["SPEC"]);
  });

  it("aucune page n'est perdue entre les sections et les pages libres", () => {
    const { sections, loose } = groupBySection(PAGES, SECTIONS, ["SPEC", "MEETING"]);
    const vues = [
      ...sections.flatMap((s) => s.nodes.map((n) => n.page.id)),
      ...sections.map((s) => s.rootPageId),
      ...loose.map((n) => n.page.id),
    ];
    expect(new Set(vues)).toEqual(new Set(PAGES.map((p) => p.id)));
  });
});

/**
 * Arborescence de référence. « Spécification » est la racine du paquet ; « Guide »
 * est une page voisine qui NE doit jamais y entrer, et « Annexe » une page enfant
 * de Guide - le piège classique d'un parcours qui remonterait trop haut.
 *
 *   Guide
 *   └─ Annexe
 *   Spécification            <- racine du paquet
 *   ├─ Authentification
 *   │  └─ Mot de passe
 *   └─ Zones
 */
const PAGES_SPEC = [
  { id: "guide", title: "Guide", parentId: null },
  { id: "annexe", title: "Annexe", parentId: "guide" },
  { id: "spec", title: "Spécification", parentId: null },
  { id: "zones", title: "Zones", parentId: "spec" },
  { id: "auth", title: "Authentification", parentId: "spec" },
  { id: "mdp", title: "Mot de passe", parentId: "auth" },
];

describe("readingOrder", () => {
  it("retient la racine et toutes ses descendantes, et rien d'autre", () => {
    const ids = readingOrder(PAGES_SPEC, "spec").map((e) => e.page.id);
    expect(ids).toEqual(["spec", "auth", "mdp", "zones"]);
    expect(ids).not.toContain("guide");
    expect(ids).not.toContain("annexe");
  });

  it("suit l'ordre de LECTURE : profondeur d'abord, frères par ordre alphabétique", () => {
    // « Authentification » avant « Zones », et « Mot de passe » inséré juste
    // après son parent - c'est l'ordre du sommaire, donc du document.
    expect(readingOrder(PAGES_SPEC, "spec").map((e) => e.page.title)).toEqual([
      "Spécification",
      "Authentification",
      "Mot de passe",
      "Zones",
    ]);
  });

  it("numérote les positions sans trou, à partir de zéro", () => {
    expect(readingOrder(PAGES_SPEC, "spec").map((e) => e.order)).toEqual([0, 1, 2, 3]);
  });

  it("construit le chemin depuis la racine du paquet, incluse", () => {
    const byId = new Map(readingOrder(PAGES_SPEC, "spec").map((e) => [e.page.id, e]));
    expect(byId.get("spec")!.path).toBe("Spécification");
    expect(byId.get("auth")!.path).toBe("Spécification / Authentification");
    expect(byId.get("mdp")!.path).toBe(
      "Spécification / Authentification / Mot de passe",
    );
  });

  it("mesure la profondeur relativement à la racine du paquet", () => {
    const byId = new Map(readingOrder(PAGES_SPEC, "spec").map((e) => [e.page.id, e]));
    expect(byId.get("spec")!.depth).toBe(0);
    expect(byId.get("auth")!.depth).toBe(1);
    expect(byId.get("mdp")!.depth).toBe(2);
  });

  it("ne renvoie que la racine pour une feuille", () => {
    expect(readingOrder(PAGES_SPEC, "zones").map((e) => e.page.id)).toEqual(["zones"]);
  });

  it("accepte un sous-arbre ancré à mi-hauteur", () => {
    expect(readingOrder(PAGES_SPEC, "auth").map((e) => e.path)).toEqual([
      "Authentification",
      "Authentification / Mot de passe",
    ]);
  });

  it("renvoie un tableau vide si la racine n'existe pas", () => {
    expect(readingOrder(PAGES_SPEC, "inconnu")).toEqual([]);
  });

  it("ne boucle pas sur un cycle parent/enfant", () => {
    const cycle = [
      { id: "a", title: "A", parentId: "b" },
      { id: "b", title: "B", parentId: "a" },
    ];
    const ids = readingOrder(cycle, "a").map((e) => e.page.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("est insensible à l'ordre des pages en entrée", () => {
    const shuffled = [...PAGES_SPEC].reverse();
    expect(readingOrder(shuffled, "spec").map((e) => e.page.id)).toEqual(
      readingOrder(PAGES_SPEC, "spec").map((e) => e.page.id),
    );
  });
});
