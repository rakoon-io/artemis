import { describe, expect, it } from "vitest";
import {
  formatVersionLabel,
  isInSpecSubtree,
  nextVersionNumber,
  specSubtree,
} from "./spec-package";

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
const pages = [
  { id: "guide", title: "Guide", parentId: null },
  { id: "annexe", title: "Annexe", parentId: "guide" },
  { id: "spec", title: "Spécification", parentId: null },
  { id: "zones", title: "Zones", parentId: "spec" },
  { id: "auth", title: "Authentification", parentId: "spec" },
  { id: "mdp", title: "Mot de passe", parentId: "auth" },
];

describe("specSubtree", () => {
  it("retient la racine et toutes ses descendantes, et rien d'autre", () => {
    const ids = specSubtree(pages, "spec").map((e) => e.page.id);
    expect(ids).toEqual(["spec", "auth", "mdp", "zones"]);
    expect(ids).not.toContain("guide");
    expect(ids).not.toContain("annexe");
  });

  it("suit l'ordre de LECTURE : profondeur d'abord, frères par ordre alphabétique", () => {
    // « Authentification » avant « Zones », et « Mot de passe » inséré juste
    // après son parent - c'est l'ordre du sommaire, donc du document.
    expect(specSubtree(pages, "spec").map((e) => e.page.title)).toEqual([
      "Spécification",
      "Authentification",
      "Mot de passe",
      "Zones",
    ]);
  });

  it("numérote les positions sans trou, à partir de zéro", () => {
    expect(specSubtree(pages, "spec").map((e) => e.order)).toEqual([0, 1, 2, 3]);
  });

  it("construit le chemin depuis la racine du paquet, incluse", () => {
    const byId = new Map(specSubtree(pages, "spec").map((e) => [e.page.id, e]));
    expect(byId.get("spec")!.path).toBe("Spécification");
    expect(byId.get("auth")!.path).toBe("Spécification / Authentification");
    expect(byId.get("mdp")!.path).toBe(
      "Spécification / Authentification / Mot de passe",
    );
  });

  it("mesure la profondeur relativement à la racine du paquet", () => {
    const byId = new Map(specSubtree(pages, "spec").map((e) => [e.page.id, e]));
    expect(byId.get("spec")!.depth).toBe(0);
    expect(byId.get("auth")!.depth).toBe(1);
    expect(byId.get("mdp")!.depth).toBe(2);
  });

  it("ne renvoie que la racine pour une feuille", () => {
    expect(specSubtree(pages, "zones").map((e) => e.page.id)).toEqual(["zones"]);
  });

  it("accepte un sous-arbre ancré à mi-hauteur", () => {
    expect(specSubtree(pages, "auth").map((e) => e.path)).toEqual([
      "Authentification",
      "Authentification / Mot de passe",
    ]);
  });

  it("renvoie un tableau vide si la racine n'existe pas", () => {
    expect(specSubtree(pages, "inconnu")).toEqual([]);
  });

  it("ne boucle pas sur un cycle parent/enfant", () => {
    const cycle = [
      { id: "a", title: "A", parentId: "b" },
      { id: "b", title: "B", parentId: "a" },
    ];
    const ids = specSubtree(cycle, "a").map((e) => e.page.id);
    expect(ids).toEqual(["a", "b"]);
  });

  it("est insensible à l'ordre des pages en entrée", () => {
    const shuffled = [...pages].reverse();
    expect(specSubtree(shuffled, "spec").map((e) => e.page.id)).toEqual(
      specSubtree(pages, "spec").map((e) => e.page.id),
    );
  });
});

describe("isInSpecSubtree", () => {
  it("reconnaît la racine et ses descendantes", () => {
    for (const id of ["spec", "auth", "mdp", "zones"]) {
      expect(isInSpecSubtree(pages, "spec", id)).toBe(true);
    }
  });

  it("écarte les pages étrangères au paquet", () => {
    expect(isInSpecSubtree(pages, "spec", "guide")).toBe(false);
    expect(isInSpecSubtree(pages, "spec", "annexe")).toBe(false);
  });
});

describe("nextVersionNumber", () => {
  it("commence à 1", () => {
    expect(nextVersionNumber([])).toBe(1);
  });

  it("suit le maximum, non le décompte", () => {
    // Le point du test : si « v2 » avait été supprimée, réutiliser le numéro 3
    // ferait désigner deux documents différents par « v3 ».
    expect(nextVersionNumber([1, 3])).toBe(4);
    expect(nextVersionNumber([3, 1, 2])).toBe(4);
  });
});

describe("formatVersionLabel", () => {
  it("affiche le seul numéro à défaut de libellé", () => {
    expect(formatVersionLabel(3)).toBe("v3");
    expect(formatVersionLabel(3, null)).toBe("v3");
    expect(formatVersionLabel(3, "   ")).toBe("v3");
  });

  it("garde le numéro en tête quand un libellé est saisi", () => {
    expect(formatVersionLabel(3, "Recette client")).toBe("v3 — Recette client");
    expect(formatVersionLabel(1, "  MVP  ")).toBe("v1 — MVP");
  });
});
