import { describe, it, expect } from "vitest";
import {
  groupByActivity,
  ticketActivityState,
  type ColumnBounds,
} from "./my-activity";

/** Workflow par défaut : Backlog(0) … Terminé(4). */
const defaut: ColumnBounds = { first: 0, last: 4 };

const t = (projectId: string, order: number, key = `${projectId}-${order}`) => ({
  key,
  projectId,
  column: { order },
});

describe("ticketActivityState", () => {
  it("range la colonne d'entrée dans « à faire »", () => {
    expect(ticketActivityState(t("p", 0), defaut)).toBe("todo");
  });

  it("range la dernière colonne dans « terminé »", () => {
    expect(ticketActivityState(t("p", 4), defaut)).toBe("done");
  });

  it("range les colonnes intermédiaires dans « en cours »", () => {
    expect(ticketActivityState(t("p", 1), defaut)).toBe("doing");
    expect(ticketActivityState(t("p", 2), defaut)).toBe("doing");
    expect(ticketActivityState(t("p", 3), defaut)).toBe("doing");
  });

  it("se fie au rang, pas au nom : un workflow à 2 colonnes n'a pas d'« en cours »", () => {
    const court: ColumnBounds = { first: 0, last: 1 };
    expect(ticketActivityState(t("p", 0), court)).toBe("todo");
    expect(ticketActivityState(t("p", 1), court)).toBe("done");
  });

  it("compte tout comme terminé quand l'entrée est aussi la sortie", () => {
    expect(ticketActivityState(t("p", 0), { first: 0, last: 0 })).toBe("done");
  });

  it("tient un rang au-delà de la dernière colonne pour terminé", () => {
    expect(ticketActivityState(t("p", 9), defaut)).toBe("done");
  });
});

describe("groupByActivity", () => {
  it("répartit les tickets dans les trois états", () => {
    const bounds = new Map([["p", defaut]]);
    const activity = groupByActivity(
      [t("p", 0), t("p", 2), t("p", 4)],
      bounds,
    );
    expect(activity.todo.map((x) => x.key)).toEqual(["p-0"]);
    expect(activity.doing.map((x) => x.key)).toEqual(["p-2"]);
    expect(activity.done.map((x) => x.key)).toEqual(["p-4"]);
  });

  it("applique à chaque projet SES propres rangs", () => {
    // Même rang 1, deux verdicts : fin du workflow court, milieu du long.
    const bounds = new Map([
      ["court", { first: 0, last: 1 }],
      ["long", defaut],
    ]);
    const activity = groupByActivity([t("court", 1), t("long", 1)], bounds);
    expect(activity.done.map((x) => x.projectId)).toEqual(["court"]);
    expect(activity.doing.map((x) => x.projectId)).toEqual(["long"]);
  });

  it("conserve l'ordre d'entrée dans chaque groupe", () => {
    const bounds = new Map([["p", defaut]]);
    const activity = groupByActivity(
      [t("p", 2, "a"), t("p", 0, "b"), t("p", 3, "c"), t("p", 1, "d")],
      bounds,
    );
    expect(activity.doing.map((x) => x.key)).toEqual(["a", "c", "d"]);
  });

  it("ignore un ticket dont le projet n'a aucune colonne connue", () => {
    const activity = groupByActivity([t("inconnu", 0)], new Map());
    expect(activity).toEqual({ todo: [], doing: [], done: [] });
  });

  it("renvoie trois groupes vides sans ticket", () => {
    expect(groupByActivity([], new Map())).toEqual({
      todo: [],
      doing: [],
      done: [],
    });
  });
});
