import { describe, expect, it } from "vitest";
import {
  countDone,
  isReleaseLate,
  isTicketDone,
  undoneFirst,
} from "./release-progress";

const LE_9 = new Date("2026-07-09T12:00:00Z").getTime();

describe("isReleaseLate", () => {
  it("dit vrai quand la date visée est passée", () => {
    expect(
      isReleaseLate(
        { state: "PLANNED", dueDate: new Date("2026-07-01") },
        LE_9,
      ),
    ).toBe(true);
  });

  it("dit faux quand la date est à venir", () => {
    expect(
      isReleaseLate(
        { state: "PLANNED", dueDate: new Date("2026-08-01") },
        LE_9,
      ),
    ).toBe(false);
  });

  it("dit faux sans date visée : rien n'a été promis", () => {
    expect(isReleaseLate({ state: "PLANNED", dueDate: null }, LE_9)).toBe(
      false,
    );
  });

  it("dit faux pour une version LIVRÉE, même en retard", () => {
    // Elle est sortie : le retard appartient à l'histoire, pas à l'état courant.
    expect(
      isReleaseLate(
        { state: "RELEASED", dueDate: new Date("2026-01-01") },
        LE_9,
      ),
    ).toBe(false);
  });
});

describe("countDone", () => {
  const t = (order: number) => ({ column: { order } });

  it("compte ce qui a atteint la dernière colonne", () => {
    expect(countDone([t(0), t(1), t(3), t(3)], 3)).toBe(2);
  });

  it("compte aussi au-delà, si une colonne a été ajoutée depuis", () => {
    expect(countDone([t(4)], 3)).toBe(1);
  });

  it("rend zéro sur une version vide", () => {
    expect(countDone([], 3)).toBe(0);
  });
});

describe("undoneFirst", () => {
  const t = (id: string, order: number) => ({ id, column: { order } });

  it("remonte ce qui reste à faire et repousse l'achevé", () => {
    const tries = undoneFirst([t("a", 4), t("b", 1), t("c", 4), t("d", 2)], 4);
    expect(tries.map((x) => x.id)).toEqual(["b", "d", "a", "c"]);
  });

  it("conserve l'ordre d'origine À L'INTÉRIEUR de chaque groupe", () => {
    // Un tri instable ferait sautiller les lignes à chaque changement de colonne.
    const tries = undoneFirst([t("a", 1), t("b", 2), t("c", 3)], 9);
    expect(tries.map((x) => x.id)).toEqual(["a", "b", "c"]);
  });

  it("laisse une liste entièrement achevée telle quelle", () => {
    const tries = undoneFirst([t("a", 4), t("b", 4)], 4);
    expect(tries.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("ne modifie pas la liste reçue", () => {
    const source = [t("a", 4), t("b", 1)];
    undoneFirst(source, 4);
    expect(source.map((x) => x.id)).toEqual(["a", "b"]);
  });

  it("compte comme achevé ce qui DÉPASSE la dernière colonne connue", () => {
    // Une colonne ajoutée après coup ne doit pas faire régresser un ticket.
    expect(isTicketDone(t("a", 7), 4)).toBe(true);
  });
});
