import { describe, expect, it } from "vitest";
import { randomPassword, resolveSeedPassword } from "./seed-credentials";

describe("resolveSeedPassword", () => {
  it("utilise la valeur fournie, telle quelle", () => {
    expect(resolveSeedPassword("X", "choisi", false)).toEqual({
      password: "choisi",
      generated: false,
    });
  });

  it("élague les espaces autour d'une valeur fournie", () => {
    expect(resolveSeedPassword("X", "  choisi  ", false).password).toBe("choisi");
  });

  it("engendre hors production quand la variable manque", () => {
    const r = resolveSeedPassword("X", undefined, false);
    expect(r.generated).toBe(true);
    expect(r.password.length).toBeGreaterThanOrEqual(16);
  });

  it("traite une valeur vide comme une absence", () => {
    expect(resolveSeedPassword("X", "   ", false).generated).toBe(true);
  });

  it("REFUSE en production plutôt que d'inventer", () => {
    // Amorcer une production avec un mot de passe que personne n'a noté ne rend
    // service à personne ; lui en donner un connu serait recommencer la faute.
    expect(() => resolveSeedPassword("SEED_ADMIN_PASSWORD", undefined, true)).toThrow(
      /SEED_ADMIN_PASSWORD/,
    );
  });

  it("accepte une valeur fournie même en production", () => {
    expect(resolveSeedPassword("X", "fourni", true).generated).toBe(false);
  });
});

describe("randomPassword", () => {
  it("ne se répète pas", () => {
    const tirages = new Set(Array.from({ length: 200 }, () => randomPassword()));
    expect(tirages.size).toBe(200);
  });

  it("n'emploie que des caractères sans ambiguïté ni échappement", () => {
    expect(randomPassword()).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
