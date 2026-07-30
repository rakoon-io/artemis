import { describe, expect, it } from "vitest";
import {
  anchorFor,
  extractOutline,
  SECTION_ANCHOR_PREFIX,
} from "./markdown-outline";

/**
 * Le sommaire ne vaut que si ses liens aboutissent. Les tests portent donc
 * surtout sur les ANCRES : leur unicité, et le fait que le même calcul serve au
 * sommaire comme au rendu.
 */

describe("anchorFor", () => {
  it("dérive l'ancre du titre, préfixée", () => {
    const seen = new Map<string, number>();
    expect(anchorFor("Budget", seen)).toBe(`${SECTION_ANCHOR_PREFIX}budget`);
  });

  it("suffixe les intitulés répétés", () => {
    // Sans cela, le second lien « Divers » ramènerait au premier.
    const seen = new Map<string, number>();
    expect(anchorFor("Divers", seen)).toBe(`${SECTION_ANCHOR_PREFIX}divers`);
    expect(anchorFor("Divers", seen)).toBe(`${SECTION_ANCHOR_PREFIX}divers-2`);
    expect(anchorFor("Divers", seen)).toBe(`${SECTION_ANCHOR_PREFIX}divers-3`);
  });

  it("normalise accents et ponctuation comme un slug d'URL", () => {
    const seen = new Map<string, number>();
    expect(anchorFor("Préparation du lot 2 !", seen)).toBe(
      `${SECTION_ANCHOR_PREFIX}preparation-du-lot-2`,
    );
  });
});

describe("extractOutline", () => {
  const doc = [
    "Introduction libre.",
    "",
    "## Budget",
    "Texte.",
    "",
    "### Détail",
    "",
    "## Recrutement",
  ].join("\n");

  it("relève les titres dans l'ordre de lecture", () => {
    expect(extractOutline(doc).map((h) => h.title)).toEqual([
      "Budget",
      "Détail",
      "Recrutement",
    ]);
  });

  it("mesure la profondeur relativement au titre le plus haut", () => {
    // Le document commence en `##` : il ne doit pas s'afficher décalé d'un cran.
    expect(extractOutline(doc).map((h) => h.depth)).toEqual([0, 1, 0]);
    expect(extractOutline(doc).map((h) => h.level)).toEqual([2, 3, 2]);
  });

  it("conserve le niveau écrit, même si le document commence bas", () => {
    const outline = extractOutline("#### A\n\n##### B");
    expect(outline.map((h) => h.level)).toEqual([4, 5]);
    expect(outline.map((h) => h.depth)).toEqual([0, 1]);
  });

  it("donne à chaque titre une ancre unique", () => {
    const outline = extractOutline("## Divers\n\n## Divers\n\n## Autre");
    const anchors = outline.map((h) => h.anchor);
    expect(new Set(anchors).size).toBe(anchors.length);
    expect(anchors[1]).toBe(`${SECTION_ANCHOR_PREFIX}divers-2`);
  });

  it("ignore les titres écrits dans un bloc de code", () => {
    // Un extrait de shell commençant par « # » n'ouvre pas une section.
    const outline = extractOutline(
      "## Vrai\n\n```sh\n# commentaire\n## pas un titre\n```\n\n## Autre",
    );
    expect(outline.map((h) => h.title)).toEqual(["Vrai", "Autre"]);
  });

  it("ignore aussi les blocs délimités par des tildes", () => {
    const outline = extractOutline("## Vrai\n\n~~~\n## masqué\n~~~");
    expect(outline).toHaveLength(1);
  });

  it("renvoie une liste vide sur un document sans titre", () => {
    expect(extractOutline("Juste du texte.")).toEqual([]);
    expect(extractOutline("")).toEqual([]);
    expect(extractOutline(null)).toEqual([]);
    expect(extractOutline(undefined)).toEqual([]);
  });

  it("tolère les fins de ligne Windows", () => {
    expect(extractOutline(doc.replace(/\n/g, "\r\n"))).toHaveLength(3);
  });

  it("indique la ligne source de chaque titre", () => {
    // C'est par la ligne que le rendu retrouve l'ancre à poser : un décalage
    // ici, et les liens du sommaire ne mèneraient nulle part.
    expect(extractOutline(doc).map((h) => h.line)).toEqual([3, 6, 8]);
  });

  it("compte les lignes des blocs de code, qu'il ignore pourtant", () => {
    const outline = extractOutline("## A\n\n```\n## masqué\n```\n\n## B");
    expect(outline.map((h) => [h.title, h.line])).toEqual([
      ["A", 1],
      ["B", 7],
    ]);
  });

  it("produit les MÊMES ancres qu'un parcours manuel dans le même ordre", () => {
    // La propriété qui fait tenir les liens : le rendu pose ses ancres avec
    // `anchorFor` en parcourant le document, exactement comme ici.
    const seen = new Map<string, number>();
    const manual = ["Budget", "Détail", "Recrutement"].map((title) =>
      anchorFor(title, seen),
    );
    expect(extractOutline(doc).map((h) => h.anchor)).toEqual(manual);
  });
});
