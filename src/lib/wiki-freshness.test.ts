import { describe, expect, it } from "vitest";
import {
  AGEING_AFTER_DAYS,
  STALE_AFTER_DAYS,
  daysSinceCheck,
  freshnessOf,
  lastCheckedAt,
} from "./wiki-freshness";

const NOW = new Date("2026-07-31T12:00:00Z");
/** Date située `days` jours avant `NOW`. */
const ago = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);

describe("lastCheckedAt — la plus récente des deux dates", () => {
  it("retient la relecture quand elle suit la modification", () => {
    const page = { updatedAt: ago(300), reviewedAt: ago(10) };
    expect(lastCheckedAt(page)).toEqual(ago(10));
  });

  it("retient la modification quand elle suit la relecture", () => {
    // Réécrire une page, c'est aussi l'avoir relue : une relecture ancienne ne
    // doit pas faire passer pour vieille une page d'hier.
    const page = { updatedAt: ago(2), reviewedAt: ago(400) };
    expect(lastCheckedAt(page)).toEqual(ago(2));
  });

  it("se contente de la modification si rien n'a été relu", () => {
    expect(lastCheckedAt({ updatedAt: ago(5), reviewedAt: null })).toEqual(ago(5));
  });

  it("accepte les dates en chaîne, comme elles arrivent d'une API", () => {
    expect(lastCheckedAt({ updatedAt: ago(5).toISOString() })).toEqual(ago(5));
  });

  it("ne se prononce pas sur une date illisible", () => {
    expect(lastCheckedAt({ updatedAt: "pas une date" })).toBeNull();
  });
});

describe("freshnessOf — trois niveaux, deux seuils", () => {
  it("une page revue hier est fraîche", () => {
    expect(freshnessOf({ updatedAt: ago(1) }, NOW)).toBe("fresh");
  });

  it("le seuil de vieillissement est atteint AU jour dit, pas la veille", () => {
    expect(freshnessOf({ updatedAt: ago(AGEING_AFTER_DAYS - 1) }, NOW)).toBe("fresh");
    expect(freshnessOf({ updatedAt: ago(AGEING_AFTER_DAYS) }, NOW)).toBe("ageing");
  });

  it("le seuil de péremption suit la même règle", () => {
    expect(freshnessOf({ updatedAt: ago(STALE_AFTER_DAYS - 1) }, NOW)).toBe("ageing");
    expect(freshnessOf({ updatedAt: ago(STALE_AFTER_DAYS) }, NOW)).toBe("stale");
  });

  it("une relecture déclarée rajeunit une page ancienne", () => {
    const vieille = { updatedAt: ago(700), reviewedAt: ago(3) };
    expect(freshnessOf(vieille, NOW)).toBe("fresh");
  });

  it("ne se prononce pas plutôt que de rassurer à tort", () => {
    expect(freshnessOf({ updatedAt: "" }, NOW)).toBeNull();
  });
});

describe("daysSinceCheck", () => {
  it("compte les jours pleins écoulés", () => {
    expect(daysSinceCheck({ updatedAt: ago(42) }, NOW)).toBe(42);
  });

  it("plafonne à zéro une date future", () => {
    // Horloge décalée ou saisie manuelle : « relue dans trois jours » n'apprend
    // rien, et un âge négatif ferait mentir toute comparaison de seuil.
    expect(daysSinceCheck({ updatedAt: ago(-3) }, NOW)).toBe(0);
  });
});
