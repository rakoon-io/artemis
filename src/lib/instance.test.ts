import { describe, expect, it } from "vitest";
import { BRAND_COLOR, MAX_LABEL, readInstance } from "./instance";

describe("readInstance", () => {
  it("sans réglage, c'est l'instance de référence : ni étiquette, ni teinte", () => {
    expect(readInstance({})).toEqual({
      label: null,
      color: BRAND_COLOR,
      name: "Artemis",
    });
  });

  it("compose le nom affiché à partir de l'étiquette", () => {
    expect(readInstance({ label: "Recette" }).name).toBe("Artemis · Recette");
  });

  it("accepte une couleur à six chiffres et la normalise", () => {
    expect(readInstance({ color: "#C2410C" }).color).toBe("#c2410c");
  });

  it("accepte la forme courte à trois chiffres", () => {
    expect(readInstance({ color: "#0a3" }).color).toBe("#0a3");
  });

  it.each(["orange", "rgb(1,2,3)", "#12345", "c2410c", "#gggggg", ""])(
    "ignore une couleur qui n'en est pas une : %j",
    (color) => {
      // Transmise telle quelle, elle ne teinterait rien dans une feuille de
      // style et invaliderait la lecture du manifeste entier.
      expect(readInstance({ color }).color).toBe(BRAND_COLOR);
    },
  );

  it("tronque une étiquette trop longue plutôt que de la laisser déborder", () => {
    const label = readInstance({ label: "Environnement de pré-production" }).label;
    expect(label).toHaveLength(MAX_LABEL);
    expect(label).toBe("Environnemen");
  });

  it("traite une étiquette d'espaces comme une absence d'étiquette", () => {
    expect(readInstance({ label: "   " })).toMatchObject({
      label: null,
      name: "Artemis",
    });
  });

  it("élague les espaces autour des valeurs", () => {
    expect(readInstance({ label: "  Local  ", color: "  #0a3  " })).toMatchObject({
      label: "Local",
      color: "#0a3",
    });
  });

  it("tolère l'absence explicite (variable non définie)", () => {
    expect(readInstance({ label: null, color: null }).name).toBe("Artemis");
  });
});
