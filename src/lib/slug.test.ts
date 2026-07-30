import { describe, expect, it } from "vitest";
import {
  datePrefix,
  FALLBACK_SLUG,
  MAX_SLUG_LENGTH,
  slugForTitle,
  slugify,
  uniqueSlug,
} from "./slug";

/**
 * Un slug est une promesse faite à un favori : la même page, la même adresse,
 * demain comme aujourd'hui. Les tests vérifient donc d'abord la STABILITÉ et
 * l'INNOCUITÉ en URL, puis l'unicité.
 */

describe("slugify", () => {
  it("met en minuscules et remplace les espaces par des tirets", () => {
    expect(slugify("Guide du projet")).toBe("guide-du-projet");
  });

  it("retire les accents sans perdre la lettre", () => {
    expect(slugify("Spécification détaillée")).toBe("specification-detaillee");
    expect(slugify("Réunion à Nîmes")).toBe("reunion-a-nimes");
    expect(slugify("Où çà ?")).toBe("ou-ca");
  });

  it("ne laisse dans l'URL que des caractères sûrs", () => {
    const slug = slugify("Conventions : nommage & « style » (v2) !");
    expect(slug).toMatch(/^[a-z0-9-]+$/);
    expect(slug).toBe("conventions-nommage-style-v2");
  });

  it("réduit les séparateurs consécutifs à un tiret unique", () => {
    expect(slugify("A   ---   B")).toBe("a-b");
    expect(slugify("  Marges  ")).toBe("marges");
  });

  it("ne commence ni ne finit par un tiret", () => {
    for (const title of ["— Titre —", "...Titre...", "  ?Titre?  "]) {
      const slug = slugify(title);
      expect(slug.startsWith("-")).toBe(false);
      expect(slug.endsWith("-")).toBe(false);
    }
  });

  it("est stable : le même titre donne toujours le même slug", () => {
    // La propriété qui fait tenir un favori dans le temps.
    expect(slugify("Guide du projet")).toBe(slugify("Guide du projet"));
  });

  it("borne la longueur sans laisser de tiret en fin", () => {
    const slug = slugify("mot ".repeat(60));
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("retombe sur un repli quand le titre ne laisse rien d'exploitable", () => {
    // Sans ce repli on produirait une chaîne vide, donc une URL cassée.
    expect(slugify("???")).toBe(FALLBACK_SLUG);
    expect(slugify("日本語")).toBe(FALLBACK_SLUG);
    expect(slugify("   ")).toBe(FALLBACK_SLUG);
  });

  it("conserve les chiffres, utiles aux versions et aux dates", () => {
    expect(slugify("Réunion du 28 juillet 2026")).toBe(
      "reunion-du-28-juillet-2026",
    );
  });
});

describe("uniqueSlug", () => {
  it("laisse le slug intact quand il est libre", () => {
    expect(uniqueSlug("guide", [])).toBe("guide");
    expect(uniqueSlug("guide", ["autre"])).toBe("guide");
  });

  it("suffixe à partir de 2, et cherche le premier libre", () => {
    expect(uniqueSlug("guide", ["guide"])).toBe("guide-2");
    expect(uniqueSlug("guide", ["guide", "guide-2"])).toBe("guide-3");
    // Un trou dans la suite est réutilisé : rien n'impose la continuité.
    expect(uniqueSlug("guide", ["guide", "guide-3"])).toBe("guide-2");
  });

  it("ne dépasse jamais la longueur maximale, suffixe compris", () => {
    const base = "a".repeat(MAX_SLUG_LENGTH);
    const slug = uniqueSlug(base, [base]);
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.endsWith("-2")).toBe(true);
  });
});

describe("slugForTitle", () => {
  it("enchaîne fabrication et unicité", () => {
    expect(slugForTitle("Guide du projet", [])).toBe("guide-du-projet");
    expect(slugForTitle("Guide du projet", ["guide-du-projet"])).toBe(
      "guide-du-projet-2",
    );
  });

  it("départage deux titres homonymes", () => {
    const taken: string[] = [];
    for (const expected of ["notes", "notes-2", "notes-3"]) {
      const slug = slugForTitle("Notes", taken);
      expect(slug).toBe(expected);
      taken.push(slug);
    }
  });
});

describe("slugForTitle, préfixé", () => {
  it("place le préfixe en tête", () => {
    expect(slugForTitle("Point hebdomadaire", [], "2026-07-28")).toBe(
      "2026-07-28-point-hebdomadaire",
    );
  });

  it("normalise le préfixe comme le reste", () => {
    expect(slugForTitle("Réunion", [], "28 juillet 2026")).toBe(
      "28-juillet-2026-reunion",
    );
  });

  it("ignore un préfixe vide ou inexploitable", () => {
    expect(slugForTitle("Réunion", [], "")).toBe("reunion");
    expect(slugForTitle("Réunion", [], null)).toBe("reunion");
    expect(slugForTitle("Réunion", [], "???")).toBe("reunion");
  });

  it("respecte la longueur maximale, préfixe compris", () => {
    const slug = slugForTitle("mot ".repeat(60), [], "2026-07-28");
    expect(slug.length).toBeLessThanOrEqual(MAX_SLUG_LENGTH);
    expect(slug.startsWith("2026-07-28-")).toBe(true);
    expect(slug.endsWith("-")).toBe(false);
  });

  it("départage deux réunions du même jour au même titre", () => {
    const taken: string[] = [];
    for (const attendu of ["2026-07-28-point", "2026-07-28-point-2"]) {
      const slug = slugForTitle("Point", taken, "2026-07-28");
      expect(slug).toBe(attendu);
      taken.push(slug);
    }
  });
});

describe("datePrefix", () => {
  it("rend la date au format AAAA-MM-JJ", () => {
    expect(datePrefix(new Date("2026-07-28T00:00:00Z"))).toBe("2026-07-28");
    expect(datePrefix("2026-01-05")).toBe("2026-01-05");
  });

  it("lit en UTC, comme les dates sont écrites", () => {
    // Minuit UTC : le jour rendu doit être celui qui a été saisi, quel que soit
    // le fuseau de la machine qui exécute.
    expect(datePrefix(new Date("2026-12-31T00:00:00Z"))).toBe("2026-12-31");
  });

  it("rend null sur une valeur absente ou invalide", () => {
    expect(datePrefix(null)).toBeNull();
    expect(datePrefix(undefined)).toBeNull();
    expect(datePrefix("pas une date")).toBeNull();
  });
});
