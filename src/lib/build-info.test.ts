import { describe, expect, it } from "vitest";
import { describeBuild, type BuildInfo } from "./build-info";

const build = (over: Partial<BuildInfo> = {}): BuildInfo => ({
  version: "0.1.0",
  commit: "46cc1f502b27809adcb809cb6afb5675b60904d5",
  commitDate: "2026-07-31T09:52:48+02:00",
  ...over,
});

describe("describeBuild", () => {
  it("abrège l'empreinte à sept caractères, comme Git", () => {
    expect(describeBuild(build()).release).toBe("v0.1.0+46cc1f5");
  });

  it("normalise la date en ISO UTC, quel que soit le fuseau reçu", () => {
    // 09:52:48+02:00 est le même instant que 07:52:48Z.
    expect(describeBuild(build()).dateTime).toBe("2026-07-31T07:52:48.000Z");
  });

  it("hors dépôt Git, affiche la seule version", () => {
    const label = describeBuild(build({ commit: null, commitDate: null }));
    expect(label).toEqual({ release: "v0.1.0", dateTime: null });
  });

  it("sans version lisible, se rabat sur l'empreinte", () => {
    expect(describeBuild(build({ version: "" })).release).toBe("46cc1f5");
  });

  it("n'invente rien quand tout manque", () => {
    const label = describeBuild({ version: "", commit: null, commitDate: null });
    expect(label).toEqual({ release: null, dateTime: null });
  });

  it("écarte une date que rien ne sait lire", () => {
    // `new Date("plus tard")` rend un objet valide au temps NaN : sans garde,
    // `<time dateTime>` porterait une valeur illisible.
    expect(describeBuild(build({ commitDate: "plus tard" })).dateTime).toBeNull();
  });

  it("tolère les espaces autour des valeurs injectées au build", () => {
    const label = describeBuild(build({ version: " 0.2.0 ", commit: " abcdef1234 " }));
    expect(label.release).toBe("v0.2.0+abcdef1");
  });

  it("n'exige pas une empreinte plus longue que celle reçue", () => {
    expect(describeBuild(build({ commit: "abc" })).release).toBe("v0.1.0+abc");
  });

  it("accepte une longueur d'empreinte choisie", () => {
    expect(describeBuild(build(), 12).release).toBe("v0.1.0+46cc1f502b27");
  });
});
