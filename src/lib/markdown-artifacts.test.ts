import { describe, expect, it } from "vitest";
import { stripEditorArtifacts } from "./markdown-artifacts";

describe("stripEditorArtifacts", () => {
  it("vide une ligne qui n'est qu'un saut", () => {
    expect(stripEditorArtifacts("Avant.\n\n<br />\n\nAprès.")).toBe(
      "Avant.\n\n\n\nAprès.",
    );
  });

  it("conserve le nombre de lignes", () => {
    // Les encarts et les ancres du sommaire se repèrent par numéro de ligne :
    // en retirer une les décalerait tous.
    const md = "# Titre\n\n<br />\n\n## Sous-titre";
    expect(stripEditorArtifacts(md).split("\n")).toHaveLength(
      md.split("\n").length,
    );
  });

  it("reconnaît les quatre écritures que produit l'éditeur", () => {
    for (const tag of ["<br />", "<br>", "<br/>", "<br >"]) {
      expect(stripEditorArtifacts(`a\n\n${tag}\n\nb`)).toBe("a\n\n\n\nb");
    }
  });

  it("tolère l'indentation et la casse", () => {
    expect(stripEditorArtifacts("a\n\n  <BR/>  \n\nb")).toBe("a\n\n\n\nb");
  });

  it("garde le « > » d'une citation, sans quoi elle serait coupée en deux", () => {
    // Vider la ligne entière ferait deux citations là où il n'y en avait qu'une,
    // et l'encart perdrait tout ce qui suit le saut.
    const md = "> [!NOTE]\n>\n> <br />\n>\n> La suite.";
    expect(stripEditorArtifacts(md)).toBe("> [!NOTE]\n>\n> \n>\n> La suite.");
  });

  it("garde les « > » imbriqués", () => {
    expect(stripEditorArtifacts("> > <br />")).toBe("> > ");
  });

  it("garde le marqueur d'un élément de liste", () => {
    expect(stripEditorArtifacts("* premier\n\n* <br />\n\n* second")).toBe(
      "* premier\n\n* \n\n* second",
    );
    expect(stripEditorArtifacts("1. un\n\n2. <br />")).toBe("1. un\n\n2. ");
  });

  it("épargne un saut AU MILIEU d'une ligne", () => {
    // Dans une cellule de tableau, c'est la seule façon d'aller à la ligne -
    // un usage légitime qu'on ne doit pas casser.
    const md = "| a | première<br />seconde |";
    expect(stripEditorArtifacts(md)).toBe(md);
  });

  it("épargne un bloc de code qui montre la balise", () => {
    const md = "```html\n<br />\n```";
    expect(stripEditorArtifacts(md)).toBe(md);
  });

  it("reprend le nettoyage après le bloc de code", () => {
    expect(stripEditorArtifacts("```\n<br />\n```\n\n<br />\n\nfin")).toBe(
      "```\n<br />\n```\n\n\n\nfin",
    );
  });

  it("laisse intact un texte qui n'en contient pas", () => {
    const md = "# Titre\n\nUn paragraphe.\n";
    expect(stripEditorArtifacts(md)).toBe(md);
  });

  it("ne touche pas à une balise qui n'est pas un saut", () => {
    const md = "<brouillon>";
    expect(stripEditorArtifacts(md)).toBe(md);
  });
});
