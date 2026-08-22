import { describe, expect, it } from "vitest";
import {
  EXCERPT_RADIUS,
  excerptAround,
  mentionNeedle,
  stripMarkdown,
} from "./mentions-search";
import { userMentionMarkdown } from "./wiki-mentions";

/** L'adresse de référence de tous les cas ci-dessous. */
const JEAN = "jean@x.fr";
const AIGUILLE = mentionNeedle(JEAN);

/** Une citation telle que `userMentionMarkdown` l'écrit dans le Markdown. */
const CITATION = `[@Jean](mailto:${JEAN})`;

describe("mentionNeedle", () => {
  it("fabrique la trace exacte que laisse une citation", () => {
    expect(mentionNeedle(JEAN)).toBe("(mailto:jean@x.fr)");
    // Ce que l'on cherche existe bel et bien dans le Markdown produit.
    expect(CITATION).toContain(mentionNeedle(JEAN));
  });

  it("coupe les blancs autour de l'adresse", () => {
    // Une adresse recopiée à la main traîne souvent une espace ou un retour
    // à la ligne : l'aiguille doit rester la même.
    expect(mentionNeedle("  jean@x.fr\n")).toBe(AIGUILLE);
    expect(mentionNeedle("\tjean@x.fr ")).toBe(AIGUILLE);
  });

  it("ne se trouve PAS dans la citation d'une adresse qui la préfixe", () => {
    /**
     * La raison d'être de la parenthèse fermante, et le cas qui compte.
     * `jean@x.fr` préfixe `jean@x.fr.invalid` : sans la parenthèse, chercher
     * « mailto:jean@x.fr » ramènerait les citations d'un homonyme, et Jean
     * lirait les messages destinés à quelqu'un d'autre.
     */
    const texteDunAutre = `Merci [@Jean](mailto:${JEAN}.invalid) pour la relecture.`;

    expect(texteDunAutre.includes(mentionNeedle(JEAN))).toBe(false);
    // La preuve que c'est bien la parenthèse qui tranche : sans elle, la
    // recherche mordait sur l'adresse voisine.
    expect(texteDunAutre.includes(`mailto:${JEAN}`)).toBe(true);
    // Et le propriétaire de l'adresse longue, lui, se retrouve.
    expect(texteDunAutre.includes(mentionNeedle(`${JEAN}.invalid`))).toBe(true);
  });

  it("distingue deux adresses qui ne diffèrent que par leur fin", () => {
    const texte = `[@Jeanne](mailto:jeanne@x.fr) et [@Jean](mailto:${JEAN})`;
    expect(texte).toContain(mentionNeedle(JEAN));
    expect(texte).toContain(mentionNeedle("jeanne@x.fr"));
  });
});

describe("excerptAround", () => {
  it("rend ce qui se disait autour, débarrassé du balisage", () => {
    // Ce qui compte n'est pas la citation mais son entourage : l'extrait se
    // lit d'une traite, sans crochets ni adresse.
    const texte = `Merci ${CITATION} pour la relecture.`;
    expect(excerptAround(texte, AIGUILLE)).toBe("Merci @Jean pour la relecture.");
  });

  it("garde le libellé de la citation, qui dit de qui l'on parle", () => {
    // « @Jean » est le libellé d'un lien : le déballisage le conserve, tandis
    // que l'adresse et la syntaxe disparaissent.
    const extrait = excerptAround(`On attend ${CITATION} sur ce point.`, AIGUILLE);
    expect(extrait).toContain("@Jean");
    expect(extrait).not.toContain("mailto:");
    expect(extrait).not.toContain("](");
  });

  it("ne met aucun point de suspension quand le texte tient dans le rayon", () => {
    const texte = `Merci ${CITATION}.`;
    const extrait = excerptAround(texte, AIGUILLE);
    expect(extrait.startsWith("…")).toBe(false);
    expect(extrait.endsWith("…")).toBe(false);
    expect(extrait).toBe("Merci @Jean.");
  });

  it("met les points de suspension des deux côtés quand le texte déborde", () => {
    const texte = `${"a".repeat(200)} ${CITATION} ${"b".repeat(200)}`;
    const extrait = excerptAround(texte, AIGUILLE);
    expect(extrait.startsWith("…")).toBe(true);
    expect(extrait.endsWith("…")).toBe(true);
    expect(extrait).toContain("@Jean");
  });

  it("n'ouvre pas sur des points de suspension quand la citation ouvre le texte", () => {
    // Rien n'a été coupé à gauche : annoncer une coupure serait mentir.
    const texte = `${CITATION} ${"b".repeat(300)}`;
    const extrait = excerptAround(texte, AIGUILLE);
    expect(extrait.startsWith("…")).toBe(false);
    expect(extrait.startsWith("@Jean")).toBe(true);
    expect(extrait.endsWith("…")).toBe(true);
  });

  it("ne ferme pas sur des points de suspension quand la citation clôt le texte", () => {
    const texte = `${"a".repeat(300)} ${CITATION}.`;
    const extrait = excerptAround(texte, AIGUILLE);
    expect(extrait.startsWith("…")).toBe(true);
    expect(extrait.endsWith("…")).toBe(false);
    expect(extrait.endsWith("@Jean.")).toBe(true);
  });

  it("rend le début du texte quand l'aiguille est absente, sans jamais jeter", () => {
    // Le texte a pu être modifié entre la requête et l'affichage : un début
    // de texte vaut mieux qu'une erreur ou qu'un extrait vide.
    const texte = "Un texte sans la moindre citation dedans.";
    expect(() => excerptAround(texte, AIGUILLE)).not.toThrow();
    expect(excerptAround(texte, AIGUILLE)).toBe(texte);

    // Sur un texte long, le début est rendu puis tronqué.
    const long = "z".repeat(300);
    const extrait = excerptAround(long, AIGUILLE, 20);
    expect(extrait.startsWith("…")).toBe(false);
    expect(extrait.endsWith("…")).toBe(true);
    expect(extrait.startsWith("zzz")).toBe(true);
  });

  it("rend une chaîne vide sur un texte vide", () => {
    expect(excerptAround("", AIGUILLE)).toBe("");
    expect(excerptAround("", AIGUILLE, 5)).toBe("");
  });

  it("rend une chaîne vide quand il ne reste rien après déballisage", () => {
    // Une ligne qui n'était QUE du balisage ne laisse rien à lire : mieux
    // vaut rien que des points de suspension autour du vide.
    expect(excerptAround("***", AIGUILLE)).toBe("");
  });

  it("respecte un rayon personnalisé", () => {
    const texte = `${"a".repeat(50)} ${CITATION} ${"b".repeat(50)}`;
    expect(excerptAround(texte, AIGUILLE, 8)).toBe("…@Jean bbbbbbb…");
    // Un rayon plus serré rend forcément un extrait plus court.
    expect(excerptAround(texte, AIGUILLE, 8).length).toBeLessThan(
      excerptAround(texte, AIGUILLE, 40).length,
    );
  });

  it("prend le rayon par défaut quand le troisième argument est tu", () => {
    const texte = `${"a".repeat(200)} ${CITATION} ${"b".repeat(200)}`;
    expect(EXCERPT_RADIUS).toBe(90);
    expect(excerptAround(texte, AIGUILLE)).toBe(
      excerptAround(texte, AIGUILLE, EXCERPT_RADIUS),
    );
  });

  it("se cale sur la PREMIÈRE occurrence", () => {
    // Deux citations de la même personne : c'est la première qui donne le ton.
    const texte = `${CITATION} ouvre. ${"m".repeat(400)} ${CITATION} ferme.`;
    expect(excerptAround(texte, AIGUILLE)).toContain("ouvre.");
    expect(excerptAround(texte, AIGUILLE)).not.toContain("ferme.");
  });
});

describe("stripMarkdown", () => {
  it("réduit un lien à son libellé", () => {
    expect(stripMarkdown("Voir [la page](https://x.io/p) pour le détail.")).toBe(
      "Voir la page pour le détail.",
    );
  });

  it("réduit une image à son texte de remplacement, sans « ! » orphelin", () => {
    // Les images passent AVANT les liens : traitées comme un lien, elles
    // laisseraient leur point d'exclamation en tête.
    const nu = stripMarkdown("![Logo](https://x.io/a.png) puis la suite");
    expect(nu).toBe("Logo puis la suite");
    expect(nu).not.toContain("!");
  });

  it("retire les titres, quel que soit leur niveau", () => {
    expect(stripMarkdown("# Titre\ntexte")).toBe("Titre texte");
    expect(stripMarkdown("###### Petit titre")).toBe("Petit titre");
    // Un titre indenté reste un titre.
    expect(stripMarkdown("  ## Titre indenté")).toBe("Titre indenté");
  });

  it("retire les marques de citation en début de ligne", () => {
    expect(stripMarkdown("> cite\n>autre")).toBe("cite autre");
  });

  it("retire les puces, des trois formes", () => {
    expect(stripMarkdown("- un\n* deux\n+ trois")).toBe("un deux trois");
  });

  it("retire les marqueurs d'emphase et de code, jamais leur contenu", () => {
    expect(stripMarkdown("**gras** _italique_ ~~barré~~ `code`")).toBe(
      "gras italique barré code",
    );
  });

  it("réduit tout blanc à une espace et rogne les bords", () => {
    expect(stripMarkdown("  a\n\n   b\t\tc  ")).toBe("a b c");
    expect(stripMarkdown("une phrase\nsur deux lignes")).toBe(
      "une phrase sur deux lignes",
    );
  });

  it("laisse intact un texte qui ne porte aucun balisage", () => {
    expect(stripMarkdown("Rien à retirer ici.")).toBe("Rien à retirer ici.");
    expect(stripMarkdown("")).toBe("");
  });

  it("déballise une citation dont le nom porte des crochets", () => {
    /**
     * `userMentionMarkdown` échappe les crochets du nom (cf. `escapeLabel`
     * dans wiki-mentions.ts) : « Ana [DSI] » s'écrit `[@Ana \[DSI\]](mailto:…)`.
     * Une expression de lien qui refuserait tout `]` dans le libellé, fût-il
     * échappé, ne reconnaîtrait pas cette citation : elle ressortirait telle
     * quelle dans l'aperçu, syntaxe ET adresse électronique comprises.
     *
     * Les échappements eux-mêmes ne se lisent pas : ils ont fait leur office
     * dans le Markdown, ils n'ont rien à faire dans un aperçu.
     */
    const citation = "[@Ana \\[DSI\\]](mailto:ana@x.io)";
    expect(stripMarkdown(`Merci ${citation} pour tout.`)).toBe(
      "Merci @Ana [DSI] pour tout.",
    );
  });

  it("ne laisse jamais fuiter l'adresse d'une personne citée", () => {
    /**
     * C'est la raison d'être du déballisage dans un aperçu : la citation doit
     * s'y lire par son nom, l'adresse restant l'affaire du Markdown. On le
     * vérifie sur les deux formes, avec et sans crochets dans le nom.
     */
    for (const citation of [
      "[@Jean](mailto:jean@x.fr)",
      "[@Ana \\[DSI\\]](mailto:ana@x.io)",
    ]) {
      const rendu = stripMarkdown(`Bonjour ${citation}, merci.`);
      expect(rendu).not.toContain("mailto:");
      expect(rendu).not.toContain("@x.fr");
      expect(rendu).not.toContain("@x.io");
    }
  });
});

/**
 * LE CONTRAT QUI PORTE TOUTE LA FONCTIONNALITÉ.
 *
 * Retrouver ses citations suppose que ce que l'ÉDITEUR ÉCRIT contienne ce que la
 * RECHERCHE CHERCHE. Les deux vivent dans des modules distincts, écrits à des
 * moments différents : rien dans les types ne les tient d'accord, et une
 * divergence ne casserait rien - la zone « Mon activité » n'afficherait plus
 * jamais aucune citation, silencieusement. C'est exactement le genre de panne
 * qu'aucune erreur ne signale, donc celui qu'il faut tester.
 */
describe("contrat entre l'écriture d'une mention et sa recherche", () => {
  const personnes = [
    { id: "u1", name: "Jean Dupont", email: "jean@x.fr" },
    { id: "u2", name: null, email: "sans-nom@x.fr" },
    { id: "u3", name: "Ana [DSI]", email: "ana@x.io" },
    { id: "u4", name: "O'Neil \\ Backslash", email: "o.neil@x.io" },
  ];

  for (const personne of personnes) {
    it(`ce qui est écrit pour « ${personne.name ?? personne.email} » est retrouvable`, () => {
      const ecrit = userMentionMarkdown(personne);
      expect(ecrit).toContain(mentionNeedle(personne.email));
    });
  }

  it("la recherche ne confond pas deux adresses dont l'une préfixe l'autre", () => {
    const ecrit = userMentionMarkdown({ id: "u5", name: "Jean", email: "jean@x.fr.invalid" });
    expect(ecrit).not.toContain(mentionNeedle("jean@x.fr"));
  });
});

describe("aucune adresse ne sort d'un extrait", () => {
  /**
   * LE CAS QUI A ÉCHAPPÉ AUX PREMIERS TESTS. Ils n'exerçaient que des textes
   * courts, jamais tronqués. Or l'extrait est une TRANCHE : quand sa borne
   * tombe au milieu d'une citation VOISINE, il n'en reste qu'un fragment, où
   * plus aucun motif de lien n'est reconnaissable - et l'adresse d'un tiers
   * s'affichait en clair chez quelqu'un d'autre.
   */
  const CONFIDENTIELLE = "alice.martin@client-confidentiel.com";

  it("ne divulgue pas l'adresse d'une citation voisine coupée à gauche", () => {
    const texte =
      `[@Alice Martin](mailto:${CONFIDENTIELLE}) peux-tu confirmer le budget ` +
      `avant vendredi stp [@Jean](mailto:${JEAN}) prendra la suite.`;
    const extrait = excerptAround(texte, AIGUILLE);

    expect(extrait).not.toContain(CONFIDENTIELLE);
    expect(extrait).not.toContain("mailto:");
    expect(extrait).not.toContain("@client-confidentiel");
    // L'extrait reste utile : on lit toujours ce qui se disait.
    expect(extrait).toContain("confirmer le budget");
  });

  it("ne divulgue rien non plus quand la coupure tombe à droite", () => {
    const texte =
      `[@Jean](mailto:${JEAN}) prendra la suite, ` +
      `voir avec [@Alice Martin](mailto:${CONFIDENTIELLE}) pour le budget.`;
    const extrait = excerptAround(texte, AIGUILLE, 40);

    expect(extrait).not.toContain(CONFIDENTIELLE);
    expect(extrait).not.toContain("mailto:");
  });

  it("retire une adresse nue, que nulle syntaxe de lien n'entoure", () => {
    // Une adresse recopiée à la main dans un commentaire n'est pas une citation,
    // mais elle n'a pas davantage sa place dans un aperçu.
    const texte = `Écrire à ${CONFIDENTIELLE} avant de citer [@Jean](mailto:${JEAN}).`;
    expect(excerptAround(texte, AIGUILLE)).not.toContain(CONFIDENTIELLE);
  });
});
