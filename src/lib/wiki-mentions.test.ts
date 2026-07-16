import { describe, it, expect } from "vitest";
import {
  detectMention,
  splitKey,
  rankTickets,
  type TicketRef,
} from "./wiki-mentions";

const t = (key: string, title = ""): TicketRef => ({ id: key, key, title });

// Jeu de tickets avec des numéros ambigus (RKN-3 vs RKN-30 vs RKN-13).
const TICKETS: TicketRef[] = [
  t("RKN-1", "Mise en place"),
  t("RKN-3", "Limite de WIP par colonne"),
  t("RKN-13", "Bug Firefox"),
  t("RKN-30", "Migration Prisma"),
  t("RKN-31", "Configurer MinIO"),
  t("ART-3", "Autre projet"),
];

describe("detectMention", () => {
  it("détecte la mention et sa requête autour du curseur", () => {
    const value = "voir @RKN-3 pour le detail";
    const caret = "voir @RKN-3".length;
    expect(detectMention(value, caret)).toEqual({ start: 5, query: "RKN-3" });
  });

  it("ne détecte rien sans « @ » ou au milieu d'un mot", () => {
    expect(detectMention("email@RKN", 9)).toBeNull();
    expect(detectMention("voir RKN-3", 10)).toBeNull();
  });

  it("détecte une mention vide juste après « @ »", () => {
    expect(detectMention("voir @", 6)).toEqual({ start: 5, query: "" });
  });
});

describe("splitKey", () => {
  it("sépare préfixe et numéro", () => {
    expect(splitKey("rkn-3")).toEqual({ alpha: "rkn", num: "3" });
    expect(splitKey("RKN-30")).toEqual({ alpha: "rkn", num: "30" });
    expect(splitKey("rkn")).toEqual({ alpha: "rkn", num: "" });
    expect(splitKey("3")).toEqual({ alpha: "", num: "3" });
  });
});

describe("rankTickets (l'autocomplétion s'affine avec le numéro)", () => {
  it("place le numéro exact avant le préfixe de numéro (RKN-3 avant RKN-30/RKN-31)", () => {
    const keys = rankTickets(TICKETS, "RKN-3").map((x) => x.key);
    expect(keys[0]).toBe("RKN-3");
    // RKN-30 et RKN-31 suivent (préfixe « 3 »), RKN-13 est exclu.
    expect(keys).toEqual(["RKN-3", "RKN-31", "RKN-30"]);
    expect(keys).not.toContain("RKN-13");
  });

  it("s'affine chiffre par chiffre : « 3 » puis « 30 »", () => {
    expect(rankTickets(TICKETS, "RKN-3").map((x) => x.key)).toContain("RKN-30");
    const step2 = rankTickets(TICKETS, "RKN-30").map((x) => x.key);
    expect(step2).toEqual(["RKN-30"]);
  });

  it("accepte le numéro seul après « @ » (ex. « 3 »)", () => {
    const keys = rankTickets(TICKETS, "3").map((x) => x.key);
    // Numéro exact d'abord (RKN-3 et ART-3), puis préfixes (RKN-30, RKN-31).
    expect(keys.slice(0, 2).sort()).toEqual(["ART-3", "RKN-3"]);
    expect(keys).toContain("RKN-30");
    expect(keys).not.toContain("RKN-13");
  });

  it("filtre par préfixe de projet quand seules des lettres sont saisies", () => {
    const keys = rankTickets(TICKETS, "art").map((x) => x.key);
    expect(keys).toEqual(["ART-3"]);
  });

  it("recherche aussi dans le titre", () => {
    const keys = rankTickets(TICKETS, "firefox").map((x) => x.key);
    expect(keys).toEqual(["RKN-13"]);
  });

  it("sans requête, renvoie la liste récente (numéro décroissant d'origine)", () => {
    const keys = rankTickets(TICKETS, "").map((x) => x.key);
    expect(keys[0]).toBe("RKN-1");
  });
});
