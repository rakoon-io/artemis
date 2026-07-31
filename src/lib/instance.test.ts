import { describe, expect, it } from "vitest";
import { BRAND_COLOR, MAX_LABEL, readInstance, resolveInstance } from "./instance";

describe("readInstance", () => {
  it("sans réglage, c'est l'instance de référence : ni étiquette, ni teinte", () => {
    expect(readInstance({})).toMatchObject({
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

describe("token d'apparence", () => {
  it("deux réglages identiques donnent le même jeton", () => {
    expect(readInstance({ label: "Recette", color: "#c2410c" }).token).toBe(
      readInstance({ label: "Recette", color: "#c2410c" }).token,
    );
  });

  it("changer la couleur change le jeton - sans quoi le cache d'un an mentirait", () => {
    const vert = readInstance({ label: "Recette", color: "#0f766e" }).token;
    const orange = readInstance({ label: "Recette", color: "#c2410c" }).token;
    expect(vert).not.toBe(orange);
  });

  it("changer l'étiquette change le jeton", () => {
    expect(readInstance({ label: "Recette" }).token).not.toBe(
      readInstance({ label: "Local" }).token,
    );
  });

  it("reste court : il voyage dans une adresse", () => {
    expect(readInstance({ label: "Recette", color: "#c2410c" }).token.length).toBeLessThanOrEqual(8);
  });
});

describe("resolveInstance", () => {
  const sansEnv = () => {
    delete process.env.ARTEMIS_INSTANCE_LABEL;
    delete process.env.ARTEMIS_INSTANCE_COLOR;
  };

  it("sans rien, c'est l'instance de référence", () => {
    sansEnv();
    expect(resolveInstance(null)).toMatchObject({ label: null, color: BRAND_COLOR });
  });

  it("la base l'emporte sur l'environnement", () => {
    process.env.ARTEMIS_INSTANCE_LABEL = "Env";
    process.env.ARTEMIS_INSTANCE_COLOR = "#111111";
    expect(
      resolveInstance({ instanceLabel: "Base", instanceColor: "#222222" }),
    ).toMatchObject({ label: "Base", color: "#222222" });
    sansEnv();
  });

  it("superpose CHAMP PAR CHAMP : régler la couleur n'efface pas l'étiquette héritée", () => {
    process.env.ARTEMIS_INSTANCE_LABEL = "Recette";
    process.env.ARTEMIS_INSTANCE_COLOR = "#111111";
    expect(
      resolveInstance({ instanceLabel: null, instanceColor: "#222222" }),
    ).toMatchObject({ label: "Recette", color: "#222222" });
    sansEnv();
  });

  it("la chaîne vide EFFACE, là où `null` laisse hériter", () => {
    process.env.ARTEMIS_INSTANCE_LABEL = "Recette";
    // Vider le champ dans le formulaire enregistre `null` (cf. l'action), mais
    // une chaîne vide venue d'ailleurs doit valoir « pas d'étiquette ».
    expect(resolveInstance({ instanceLabel: "", instanceColor: null }).label).toBeNull();
    expect(resolveInstance({ instanceLabel: null, instanceColor: null }).label).toBe("Recette");
    sansEnv();
  });
});
