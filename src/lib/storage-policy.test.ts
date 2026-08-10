import { describe, expect, it } from "vitest";
import { localStorageAllowed } from "./storage";

/**
 * La règle du dépôt sur disque, isolée de tout disque et de tout réseau.
 *
 * Ce qu'elle protège : un déploiement où `S3_*` a été oublié écrivait dans un
 * conteneur sans volume, et perdait les fichiers au déploiement suivant sans la
 * moindre erreur. La règle refuse ce cas, et seulement celui-là.
 */
describe("localStorageAllowed", () => {
  it("refuse le disque en production quand aucun chemin n'est déclaré", () => {
    expect(localStorageAllowed("production", undefined)).toBe(false);
  });

  it("refuse aussi un chemin vide ou fait d'espaces : ce n'est pas un choix", () => {
    expect(localStorageAllowed("production", "")).toBe(false);
    expect(localStorageAllowed("production", "   ")).toBe(false);
  });

  it("autorise le disque en production dès qu'un chemin est déclaré", () => {
    expect(localStorageAllowed("production", "/data/uploads")).toBe(true);
  });

  it("laisse le développement écrire sans rien déclarer", () => {
    expect(localStorageAllowed("development", undefined)).toBe(true);
    expect(localStorageAllowed("test", undefined)).toBe(true);
    expect(localStorageAllowed(undefined, undefined)).toBe(true);
  });
});
