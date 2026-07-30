import { describe, expect, it } from "vitest";
import {
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
