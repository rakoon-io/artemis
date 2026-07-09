import { describe, it, expect } from "vitest";
import { rankBetween, rankAfter, rankBefore, initialRanks } from "./rank";

describe("rank (lexorank)", () => {
  it("insère un rang strictement compris entre deux voisins", () => {
    const a = rankAfter(null); // premier
    const b = rankAfter(a); // après a
    const mid = rankBetween(a, b);
    expect(a < mid).toBe(true);
    expect(mid < b).toBe(true);
  });

  it("rankAfter est croissant, rankBefore est décroissant", () => {
    const first = rankAfter(null);
    const second = rankAfter(first);
    expect(second > first).toBe(true);

    const before = rankBefore(first);
    expect(before < first).toBe(true);
  });

  it("initialRanks produit n rangs strictement ordonnés", () => {
    const ranks = initialRanks(5);
    expect(ranks).toHaveLength(5);
    const sorted = [...ranks].sort();
    expect(ranks).toEqual(sorted);
    expect(new Set(ranks).size).toBe(5);
  });

  it("permet des insertions répétées au même endroit sans collision", () => {
    let lo = rankAfter(null);
    const hi = rankAfter(lo);
    const seen = new Set<string>([lo, hi]);
    for (let i = 0; i < 20; i++) {
      const mid = rankBetween(lo, hi);
      expect(lo < mid && mid < hi).toBe(true);
      expect(seen.has(mid)).toBe(false);
      seen.add(mid);
      lo = mid;
    }
  });
});
