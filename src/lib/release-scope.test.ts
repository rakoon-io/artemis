import { describe, expect, it } from "vitest";
import { releaseContent, sprintAssignable } from "./release-scope";

const t = (id: string, releaseId: string | null = null) => ({ id, releaseId });

describe("releaseContent", () => {
  it("réunit les tickets rangés à la main et ceux des sprints rattachés", () => {
    const contenu = releaseContent(
      [t("a", "v1")],
      [{ id: "s1", name: "Sprint 1", tickets: [t("b"), t("c")] }],
    );
    expect(contenu.map((x) => x.id)).toEqual(["a", "b", "c"]);
    expect(contenu.map((x) => x.origin)).toEqual([
      "DIRECT",
      "SPRINT",
      "SPRINT",
    ]);
  });

  it("dit de quel sprint vient un ticket hérité", () => {
    const [herite] = releaseContent(
      [],
      [{ id: "s1", name: "Sprint 1", tickets: [t("b")] }],
    );
    expect(herite.fromSprint).toEqual({ id: "s1", name: "Sprint 1" });
  });

  it("laisse le rattachement explicite l'emporter sur celui du sprint", () => {
    // « b » est dans un sprint qui sort en v1, mais il a été rangé à la main
    // dans une autre version : il n'appartient pas à celle-ci.
    const contenu = releaseContent(
      [],
      [{ id: "s1", name: "Sprint 1", tickets: [t("b", "v2"), t("c")] }],
    );
    expect(contenu.map((x) => x.id)).toEqual(["c"]);
  });

  it("ne compte pas deux fois un ticket rattaché ET présent dans le sprint", () => {
    // Sans dédoublonnage, l'avancement dépasserait son propre total.
    const contenu = releaseContent(
      [t("a", "v1")],
      [{ id: "s1", name: "Sprint 1", tickets: [t("a", "v1"), t("b")] }],
    );
    expect(contenu.map((x) => x.id)).toEqual(["a", "b"]);
    expect(contenu.filter((x) => x.id === "a")).toHaveLength(1);
  });

  it("garde l'origine DIRECT quand le ticket est aussi dans le sprint", () => {
    const [premier] = releaseContent(
      [t("a", "v1")],
      [{ id: "s1", name: "Sprint 1", tickets: [t("a", "v1")] }],
    );
    expect(premier.origin).toBe("DIRECT");
  });

  it("dédoublonne aussi entre deux sprints rattachés à la même version", () => {
    const contenu = releaseContent(
      [],
      [
        { id: "s1", name: "Sprint 1", tickets: [t("b")] },
        { id: "s2", name: "Sprint 2", tickets: [t("b"), t("c")] },
      ],
    );
    expect(contenu.map((x) => x.id)).toEqual(["b", "c"]);
    expect(contenu[0].fromSprint?.id).toBe("s1");
  });

  it("rend une version sans sprint inchangée", () => {
    const contenu = releaseContent([t("a", "v1")], []);
    expect(contenu).toHaveLength(1);
    expect(contenu[0].origin).toBe("DIRECT");
  });
});

describe("sprintAssignable", () => {
  it("accepte un sprint libre", () => {
    expect(sprintAssignable({ releaseId: null }, "v1")).toBe(true);
  });

  it("accepte le sprint déjà rattaché à CETTE version", () => {
    expect(sprintAssignable({ releaseId: "v1" }, "v1")).toBe(true);
  });

  it("refuse un sprint qui sort déjà dans une autre version", () => {
    // Sans ce refus, rattacher ici retirerait en silence d'ailleurs.
    expect(sprintAssignable({ releaseId: "v2" }, "v1")).toBe(false);
  });
});
