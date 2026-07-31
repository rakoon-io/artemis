import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatTime, initials } from "./utils";

/* Le fuseau est passé EXPLICITEMENT partout ici : sans cela, les attentes
   dépendraient du réglage de la machine qui exécute les tests, et l'assertion
   tomberait juste chez l'un et faux chez l'autre. */

const INSTANT = new Date("2026-07-09T12:32:00Z");

describe("formatDate", () => {
  it("rend un jour, sans heure", () => {
    expect(formatDate(INSTANT, "Europe/Paris")).toBe("9 juil. 2026");
  });

  it("accepte une date écrite en texte", () => {
    expect(formatDate("2026-07-09T12:32:00Z", "Europe/Paris")).toBe("9 juil. 2026");
  });

  it("suit le fuseau demandé quand le jour bascule", () => {
    // 23:30 à Paris le 9 : c'est encore le 9 à Paris, mais déjà le 9 à 21:30 en
    // UTC. Le cas qui compte est celui d'après minuit.
    const nuit = new Date("2026-07-09T22:30:00Z");
    expect(formatDate(nuit, "UTC")).toBe("9 juil. 2026");
    expect(formatDate(nuit, "Europe/Paris")).toBe("10 juil. 2026");
  });

  it("rend un tiret plutôt que rien", () => {
    expect(formatDate(null)).toBe("-");
    expect(formatDate(undefined)).toBe("-");
    expect(formatDate("")).toBe("-");
  });

  it("ne tombe pas sur une date illisible", () => {
    // `Intl` lève une exception sur une date invalide : sans garde, une seule
    // valeur abîmée en base ferait échouer le rendu de toute la page.
    expect(formatDate("pas une date")).toBe("-");
  });
});

describe("formatDateTime", () => {
  it("rend le jour ET l'heure", () => {
    expect(formatDateTime(INSTANT, "Europe/Paris")).toBe("9 juil. 2026, 14:32");
  });

  it("dit la même chose que formatDate pour le jour", () => {
    const jour = formatDate(INSTANT, "Europe/Paris");
    expect(formatDateTime(INSTANT, "Europe/Paris").startsWith(jour)).toBe(true);
  });

  it("affiche l'heure DU FUSEAU demandé", () => {
    // C'est tout l'enjeu : un serveur en UTC afficherait 12:32 là où l'équipe a
    // enregistré à 14:32.
    expect(formatDateTime(INSTANT, "UTC")).toBe("9 juil. 2026, 12:32");
  });

  it("garde deux chiffres pour les petites heures", () => {
    const matin = new Date("2026-07-09T05:07:00Z");
    expect(formatDateTime(matin, "UTC")).toBe("9 juil. 2026, 05:07");
  });

  it("distingue deux enregistrements du même jour", () => {
    // La raison d'être de cette fonction : un historique doit permettre de
    // séparer deux versions à dix minutes d'intervalle.
    const a = formatDateTime("2026-07-09T09:00:00Z", "UTC");
    const b = formatDateTime("2026-07-09T09:10:00Z", "UTC");
    expect(a).not.toBe(b);
  });

  it("rend un tiret plutôt que rien", () => {
    expect(formatDateTime(null)).toBe("-");
    expect(formatDateTime("pas une date")).toBe("-");
  });
});

describe("initials", () => {
  it("prend les deux premiers mots d'un nom", () => {
    expect(initials("Admin Rakoon")).toBe("AR");
  });

  it("travaille sur la partie locale d'un e-mail", () => {
    expect(initials("thomas.broussard@exemple.fr")).toBe("tb");
  });

  it("rend « ? » quand il n'y a rien", () => {
    expect(initials(null)).toBe("?");
    expect(initials("")).toBe("?");
  });
});

describe("formatTime", () => {
  it("rend l'heure seule", () => {
    expect(formatTime(INSTANT, "Europe/Paris")).toBe("14:32");
    expect(formatTime(INSTANT, "UTC")).toBe("12:32");
  });

  it("rend une chaîne VIDE quand il n'y a pas de date", () => {
    // Un tiret sous un jour absent ferait deux tirets empilés dans le tableau.
    expect(formatTime(null)).toBe("");
    expect(formatTime("pas une date")).toBe("");
  });
});
