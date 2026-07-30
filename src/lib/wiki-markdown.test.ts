import { describe, expect, it } from "vitest";
import { linkifyTicketKeys } from "./wiki-markdown";

/**
 * La liaison des citations tourne à CHAQUE rendu de page, de compte rendu et de
 * description de ticket. Elle n'avait aucun test - ces cas verrouillent ce dont
 * elle est réellement responsable : reconnaître, s'abstenir, et ne jamais
 * toucher au code.
 */
const MAP = { "RKN-3": "id-3", "RKN-12": "id-12" };
const KEY = "RKN";
const link = (md: string) => linkifyTicketKeys(md, MAP, KEY);

describe("linkifyTicketKeys — ce qui devient un lien", () => {
  it("reconnaît la clé nue", () => {
    expect(link("Voir RKN-3 pour le détail.")).toBe(
      "Voir [RKN-3](/projects/RKN/tickets/id-3) pour le détail.",
    );
  });

  it("garde le « @ » d'une mention dans le libellé", () => {
    // La mention est la forme recommandée : elle doit rester lisible comme
    // telle une fois liée, sans quoi l'auteur ne retrouverait pas ce qu'il a
    // écrit.
    expect(link("cf. @RKN-3")).toBe("cf. [@RKN-3](/projects/RKN/tickets/id-3)");
  });

  it("absorbe le « # » d'une référence", () => {
    expect(link("cf. #RKN-3")).toBe("cf. [RKN-3](/projects/RKN/tickets/id-3)");
  });

  it("lie plusieurs citations dans la même phrase", () => {
    expect(link("RKN-3 puis RKN-12")).toBe(
      "[RKN-3](/projects/RKN/tickets/id-3) puis [RKN-12](/projects/RKN/tickets/id-12)",
    );
  });
});

describe("linkifyTicketKeys — ce qui reste du texte", () => {
  it("laisse intacte une clé qui n'existe pas", () => {
    // Un lien mort serait pire qu'un texte brut : il promettrait une page.
    expect(link("Voir RKN-999.")).toBe("Voir RKN-999.");
  });

  it("laisse intacte une clé d'un autre projet absent du catalogue", () => {
    expect(link("Voir ABC-1.")).toBe("Voir ABC-1.");
  });

  it("ne coupe pas un mot : « ARKN-3 » n'est pas une citation", () => {
    expect(link("ARKN-3")).toBe("ARKN-3");
  });

  it("exige un numéro", () => {
    expect(link("RKN- et RKN")).toBe("RKN- et RKN");
  });
});

describe("linkifyTicketKeys — le code est sacré", () => {
  it("ne touche pas au code en ligne", () => {
    expect(link("Le code `RKN-3` reste tel quel.")).toBe(
      "Le code `RKN-3` reste tel quel.",
    );
  });

  it("ne touche pas à un bloc de code", () => {
    const md = "Avant RKN-3\n\n```\nconst k = 'RKN-3';\n```\n\nAprès RKN-12";
    const out = link(md);
    expect(out).toContain("const k = 'RKN-3';");
    expect(out).toContain("Avant [RKN-3](/projects/RKN/tickets/id-3)");
    expect(out).toContain("Après [RKN-12](/projects/RKN/tickets/id-12)");
  });

  it("reprend la liaison après la fermeture du bloc", () => {
    // Le découpage se fait par alternance : une erreur de parité lierait le
    // code et épargnerait le texte, exactement à l'envers.
    const out = link("```\nRKN-3\n```\nRKN-3");
    expect(out).toBe("```\nRKN-3\n```\n[RKN-3](/projects/RKN/tickets/id-3)");
  });

  it("épargne plusieurs fragments de code en ligne d'affilée", () => {
    expect(link("`RKN-3` puis RKN-3 puis `RKN-12`")).toBe(
      "`RKN-3` puis [RKN-3](/projects/RKN/tickets/id-3) puis `RKN-12`",
    );
  });
});

describe("linkifyTicketKeys — cas limites", () => {
  it("rend un texte vide inchangé", () => {
    expect(link("")).toBe("");
  });

  it("n'invente rien quand le catalogue est vide", () => {
    expect(linkifyTicketKeys("RKN-3", {}, KEY)).toBe("RKN-3");
  });

  it("retrouve la clé quelle que soit sa casse dans le catalogue", () => {
    expect(linkifyTicketKeys("RKN-3", { "RKN-3": "id-3" }, KEY)).toContain(
      "/tickets/id-3",
    );
  });
});
