import { describe, expect, it } from "vitest";
import {
  calloutMarker,
  calloutTemplate,
  scanCallouts,
  splitCalloutMarker,
  type MarkdownNodeLike,
} from "./wiki-callouts";

describe("scanCallouts — reconnaître", () => {
  it("retire le marqueur et retient le genre", () => {
    const { content, byLine } = scanCallouts("> [!NOTE]\n> Ce qu'il faut savoir.");
    expect(content).toBe("> Ce qu'il faut savoir.");
    expect(byLine.get(1)).toBe("note");
  });

  it("reconnaît les trois genres", () => {
    expect(scanCallouts("> [!NOTE]\n> a").byLine.get(1)).toBe("note");
    expect(scanCallouts("> [!WARNING]\n> a").byLine.get(1)).toBe("warning");
    expect(scanCallouts("> [!IMPORTANT]\n> a").byLine.get(1)).toBe("important");
  });

  it("accepte les synonymes courants", () => {
    // Punir qui écrit « TIP » n'apprendrait rien à personne.
    expect(scanCallouts("> [!TIP]\n> a").byLine.get(1)).toBe("note");
    expect(scanCallouts("> [!CAUTION]\n> a").byLine.get(1)).toBe("warning");
  });

  it("ignore la casse du marqueur", () => {
    expect(scanCallouts("> [!note]\n> a").byLine.get(1)).toBe("note");
  });

  it("situe l'encart à la bonne ligne quand du texte le précède", () => {
    const md = "Un paragraphe.\n\n> [!WARNING]\n> Attention.";
    const { content, byLine } = scanCallouts(md);
    expect(content).toBe("Un paragraphe.\n\n> Attention.");
    // La citation commence à la ligne 3 du texte nettoyé.
    expect(byLine.get(3)).toBe("warning");
  });

  it("gère plusieurs encarts dans la même page", () => {
    const md = "> [!NOTE]\n> a\n\n> [!IMPORTANT]\n> b";
    const { content, byLine } = scanCallouts(md);
    expect(content).toBe("> a\n\n> b");
    expect(byLine.get(1)).toBe("note");
    expect(byLine.get(3)).toBe("important");
  });
});

describe("scanCallouts — s'abstenir", () => {
  it("laisse une citation ordinaire intacte", () => {
    const md = "> Une citation sans marqueur.";
    const { content, byLine } = scanCallouts(md);
    expect(content).toBe(md);
    expect(byLine.size).toBe(0);
  });

  it("ne reconnaît pas un marqueur inventé", () => {
    const md = "> [!TRUC]\n> a";
    expect(scanCallouts(md).content).toBe(md);
    expect(scanCallouts(md).byLine.size).toBe(0);
  });

  it("ne reconnaît le marqueur qu'en TÊTE de citation", () => {
    // Au milieu d'un paragraphe cité, c'est du texte que l'auteur a écrit.
    const md = "> Première ligne.\n> [!NOTE]\n> suite";
    expect(scanCallouts(md).content).toBe(md);
    expect(scanCallouts(md).byLine.size).toBe(0);
  });

  it("épargne un bloc de code qui montre la syntaxe", () => {
    const md = "```\n> [!NOTE]\n> exemple\n```";
    expect(scanCallouts(md).content).toBe(md);
    expect(scanCallouts(md).byLine.size).toBe(0);
  });

  it("reprend la reconnaissance après le bloc de code", () => {
    const md = "```\n> [!NOTE]\n```\n\n> [!NOTE]\n> vrai";
    const { content, byLine } = scanCallouts(md);
    expect(content).toBe("```\n> [!NOTE]\n```\n\n> vrai");
    expect(byLine.get(5)).toBe("note");
  });

  it("rend un texte vide inchangé", () => {
    expect(scanCallouts("").content).toBe("");
  });

  it("normalise les fins de ligne Windows sans rien perdre", () => {
    expect(scanCallouts("> [!NOTE]\r\n> a").content).toBe("> a");
  });
});

describe("calloutTemplate", () => {
  it("produit un encart que l'analyse relit", () => {
    // L'aller-retour compte : ce que la barre d'outils écrit doit être ce que
    // la lecture reconnaît, sinon le bouton ment.
    for (const kind of ["note", "warning", "important"] as const) {
      const scan = scanCallouts(`${calloutTemplate(kind)}Texte.`);
      expect(scan.byLine.get(1)).toBe(kind);
    }
  });
});

describe("scanCallouts — marqueur échappé par le sérialiseur", () => {
  // Tout sérialiseur Markdown protège un crochet en début de ligne : l'éditeur
  // en mise en forme écrit « > \[!NOTE] » de lui-même. Ne pas le relire aurait
  // fait mentir le bouton de la barre d'outils.
  it("reconnaît « > \\\\[!NOTE] »", () => {
    const { content, byLine } = scanCallouts("> \\[!NOTE]\n> a");
    expect(byLine.get(1)).toBe("note");
    expect(content).toBe("> a");
  });

  it("reconnaît les deux crochets échappés", () => {
    expect(scanCallouts("> \\[!WARNING\\]\n> a").byLine.get(1)).toBe("warning");
  });

  it("ne confond pas avec un lien de référence ordinaire", () => {
    const md = "> \\[ceci\\] n'est pas un marqueur";
    expect(scanCallouts(md).content).toBe(md);
    expect(scanCallouts(md).byLine.size).toBe(0);
  });

  it("reconnaît un marqueur suivi d'une ligne de citation vide", () => {
    // Forme que produit l'éditeur riche : le marqueur et le texte y sont deux
    // paragraphes, séparés par un « > » seul.
    const { content, byLine } = scanCallouts("> [!WARNING]\n>\n> Attention.");
    expect(byLine.get(1)).toBe("warning");
    expect(content).toBe(">\n> Attention.");
  });
});

describe("calloutMarker", () => {
  it("lit un marqueur nu", () => {
    expect(calloutMarker("[!NOTE]")).toBe("note");
    expect(calloutMarker("  [!IMPORTANT]  ")).toBe("important");
    expect(calloutMarker("\\[!WARNING]")).toBe("warning");
  });

  it("refuse ce qui n'en est pas un", () => {
    expect(calloutMarker("[!TRUC]")).toBeNull();
    expect(calloutMarker("[!NOTE] et la suite")).toBeNull();
    expect(calloutMarker("")).toBeNull();
  });
});

/* Formes d'arbre que l'éditeur riche doit reconnaître. Les deux écritures
   ci-dessous sont du Markdown équivalent pour un lecteur ; elles ne le sont pas
   pour remark, qui fait un paragraphe de l'une et deux de l'autre. */
const text = (value: string): MarkdownNodeLike => ({ type: "text", value });
const para = (...children: MarkdownNodeLike[]): MarkdownNodeLike => ({
  type: "paragraph",
  children,
});

describe("splitCalloutMarker", () => {
  it("sépare un marqueur écrit sur son propre paragraphe", () => {
    const split = splitCalloutMarker([para(text("[!NOTE]")), para(text("Corps."))]);
    expect(split?.kind).toBe("note");
    expect(split?.body).toEqual([para(text("Corps."))]);
  });

  it("sépare un marqueur suivi d'un saut analysé", () => {
    // « > [!NOTE]\n> Corps. » : un seul paragraphe, coupé par un nœud « break ».
    const split = splitCalloutMarker([
      para(text("[!WARNING]"), { type: "break" }, text("Corps.")),
    ]);
    expect(split?.kind).toBe("warning");
    expect(split?.body).toEqual([para(text("Corps."))]);
  });

  it("sépare un marqueur dont le saut est resté dans la valeur", () => {
    const split = splitCalloutMarker([para(text("[!IMPORTANT]\nCorps."))]);
    expect(split?.kind).toBe("important");
    expect(split?.body).toEqual([para(text("Corps."))]);
  });

  it("garde les blocs qui suivent, quels qu'ils soient", () => {
    const list: MarkdownNodeLike = { type: "list", children: [] };
    const split = splitCalloutMarker([para(text("[!NOTE]")), list, para(text("Fin."))]);
    expect(split?.body).toEqual([list, para(text("Fin."))]);
  });

  it("accepte le marqueur échappé par le sérialiseur", () => {
    const split = splitCalloutMarker([para(text("\\[!NOTE]")), para(text("a"))]);
    expect(split?.kind).toBe("note");
  });

  it("rend un corps vide pour un marqueur seul", () => {
    expect(splitCalloutMarker([para(text("[!NOTE]"))])).toEqual({
      kind: "note",
      body: [],
    });
  });

  it("laisse une citation ordinaire tranquille", () => {
    expect(splitCalloutMarker([para(text("Une citation."))])).toBeNull();
    expect(splitCalloutMarker([])).toBeNull();
  });

  it("ne prend pas un marqueur en MILIEU de citation", () => {
    expect(
      splitCalloutMarker([para(text("Avant.")), para(text("[!NOTE]"))]),
    ).toBeNull();
  });

  it("ne prend pas un marqueur qui commence par autre chose qu'un texte", () => {
    // Un encart dont la première ligne serait en gras n'en est pas un.
    expect(
      splitCalloutMarker([para({ type: "strong", children: [text("[!NOTE]")] })]),
    ).toBeNull();
  });

  it("ne prend pas un premier bloc qui n'est pas un paragraphe", () => {
    expect(
      splitCalloutMarker([{ type: "heading", children: [text("[!NOTE]")] }]),
    ).toBeNull();
  });
});
