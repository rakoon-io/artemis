import { describe, expect, it } from "vitest";
import {
  buildSearchText,
  buildSnippet,
  foldForIndex,
  highlightSegments,
  MAX_SEARCH_TERMS,
  searchTerms,
  toPrefixQuery,
} from "./search-text";

/**
 * La propriété qui porte tout le reste : le repli PRÉSERVE LES POSITIONS. C'est
 * elle qui permet de chercher sans accents puis de restituer l'extrait avec ses
 * accents et sa casse. Si elle tombe, les extraits se décalent silencieusement.
 */

describe("foldForIndex", () => {
  it("retire les accents et abaisse la casse", () => {
    expect(foldForIndex("Réunion À Août")).toBe("reunion a aout");
    expect(foldForIndex("Spécification")).toBe("specification");
    expect(foldForIndex("ÇÀ et Là")).toBe("ca et la");
  });

  it("conserve EXACTEMENT la longueur", () => {
    const echantillons = [
      "Réunion hebdomadaire du 28 juillet",
      "Où ça ? Là-bas — vraiment !",
      "Straße, æquo, œuvre, ﬁchier",
      "emoji 😀 et surrogates 𝔘𝔫𝔦",
      "İstanbul",
      "",
    ];
    for (const s of echantillons) {
      expect(foldForIndex(s)).toHaveLength(s.length);
    }
  });

  it("laisse chiffres et ponctuation intacts", () => {
    expect(foldForIndex("Lot 2 : export CSV (v1.3)")).toBe(
      "lot 2 : export csv (v1.3)",
    );
  });
});

describe("buildSearchText", () => {
  it("replie titre et contenu", () => {
    const out = buildSearchText("Réunion", "Le budget est validé");
    expect(out).toContain("reunion");
    expect(out).toContain("valide");
  });

  it("répète le titre, pour qu'il pèse plus lourd au classement", () => {
    const out = buildSearchText("Budget", "");
    expect(out.split("budget")).toHaveLength(3); // deux occurrences
  });
});

describe("searchTerms", () => {
  it("découpe sur tout ce qui n'est ni lettre ni chiffre", () => {
    expect(searchTerms("export CSV")).toEqual(["export", "csv"]);
    expect(searchTerms("  export,  csv ; v2 ")).toEqual(["export", "csv", "v2"]);
  });

  it("replie les accents comme le texte indexé", () => {
    // Le point de la correction : « imperatif » doit trouver « impératif ».
    expect(searchTerms("Impératif")).toEqual(["imperatif"]);
    expect(searchTerms("impératif")).toEqual(searchTerms("imperatif"));
  });

  it("ne rend rien d'exploitable sur une requête vide ou ponctuelle", () => {
    expect(searchTerms("")).toEqual([]);
    expect(searchTerms("   ")).toEqual([]);
    expect(searchTerms("?!,;")).toEqual([]);
  });

  it("borne le nombre de termes", () => {
    const longue = Array.from({ length: 20 }, (_, i) => `mot${i}`).join(" ");
    expect(searchTerms(longue)).toHaveLength(MAX_SEARCH_TERMS);
  });
});

describe("toPrefixQuery", () => {
  it("lie les termes par ET, en préfixe", () => {
    // ET : l'ordre des mots cesse de compter. Préfixe : « recrut » trouve
    // « recrutement ».
    expect(toPrefixQuery(["export", "csv"])).toBe("export:* & csv:*");
    expect(toPrefixQuery(["recrut"])).toBe("recrut:*");
  });

  it("ne produit que des caractères inoffensifs pour to_tsquery", () => {
    const q = toPrefixQuery(searchTerms("d'accord ! (vraiment) & | ! : *"));
    expect(q).toMatch(/^[a-z0-9:* &]*$/);
  });
});

describe("buildSnippet", () => {
  const contenu =
    "Titres à l'impératif, en français, moins de 80 caractères. " +
    "Exemple : « Ajouter un export CSV de la vue liste » pour rester clair.";

  it("centre l'extrait sur la première occurrence", () => {
    const s = buildSnippet(contenu, ["export"], 20);
    expect(s.text).toContain("export CSV");
    expect(s.truncatedStart).toBe(true);
    expect(s.truncatedEnd).toBe(true);
  });

  it("restitue les ACCENTS du texte d'origine, cherchés sans accent", () => {
    // Toute la raison d'être du repli à longueur constante.
    const s = buildSnippet(contenu, ["imperatif"], 15);
    expect(s.text).toContain("impératif");
  });

  it("aplatit les blancs pour rester lisible sur un Markdown multiligne", () => {
    const s = buildSnippet("## Titre\n\n- un\n- deux", ["deux"], 40);
    expect(s.text).not.toContain("\n");
  });

  it("rend le début du document quand le terme n'est que dans le titre", () => {
    const s = buildSnippet(contenu, ["introuvable"], 20);
    expect(s.text.startsWith("Titres")).toBe(true);
    expect(s.truncatedStart).toBe(false);
  });

  it("ne signale pas de troncature quand tout tient", () => {
    const s = buildSnippet("Court.", ["court"], 80);
    expect(s).toEqual({
      text: "Court.",
      truncatedStart: false,
      truncatedEnd: false,
    });
  });

  it("supporte un contenu vide", () => {
    expect(buildSnippet("", ["a"]).text).toBe("");
    expect(buildSnippet("   \n ", ["a"]).text).toBe("");
  });
});

describe("highlightSegments", () => {
  it("découpe autour des termes trouvés", () => {
    const segs = highlightSegments("Ajouter un export CSV", ["export"]);
    expect(segs).toEqual([
      { text: "Ajouter un ", match: false },
      { text: "export", match: true },
      { text: " CSV", match: false },
    ]);
  });

  it("surligne malgré les accents et la casse", () => {
    const segs = highlightSegments("Un Impératif clair", ["imperatif"]);
    expect(segs.find((s) => s.match)?.text).toBe("Impératif");
  });

  it("reconstitue exactement le texte d'origine", () => {
    // Garde-fou : le surlignage ne doit jamais perdre ni dupliquer un caractère.
    const texte = "Export, exports et exportation à l'export";
    for (const termes of [["export"], ["export", "exportation"], ["zzz"], []]) {
      expect(
        highlightSegments(texte, termes)
          .map((s) => s.text)
          .join(""),
      ).toBe(texte);
    }
  });

  it("fusionne les occurrences qui se recouvrent", () => {
    // « export » et « exports » commencent au même endroit : un seul surlignage,
    // sinon on couperait au milieu d'un mot.
    const segs = highlightSegments("des exports partout", ["export", "exports"]);
    expect(segs.filter((s) => s.match).map((s) => s.text)).toEqual(["exports"]);
  });

  it("rend un seul segment quand rien ne correspond", () => {
    expect(highlightSegments("rien ici", ["absent"])).toEqual([
      { text: "rien ici", match: false },
    ]);
  });
});
