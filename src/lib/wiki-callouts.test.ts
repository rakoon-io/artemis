import { describe, expect, it } from "vitest";
import { calloutTemplate, scanCallouts } from "./wiki-callouts";

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
});
