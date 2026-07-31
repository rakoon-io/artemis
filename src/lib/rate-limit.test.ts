import { beforeEach, describe, expect, it } from "vitest";
import {
  clearFailures,
  clientIp,
  isRateLimited,
  recordFailure,
} from "./rate-limit";

const FENETRE = 60_000;

describe("compteur d'échecs", () => {
  beforeEach(() => {
    clearFailures("k");
    clearFailures("autre");
  });

  it("ne bloque pas tant que le seuil n'est pas atteint", () => {
    for (let i = 0; i < 9; i++) recordFailure("k", FENETRE);
    expect(isRateLimited("k", 10)).toBe(false);
  });

  it("bloque au seuil", () => {
    for (let i = 0; i < 10; i++) recordFailure("k", FENETRE);
    expect(isRateLimited("k", 10)).toBe(true);
  });

  it("REGARDER ne consomme rien - sans quoi un tiers verrouillerait un compte", () => {
    // Mille lectures ne doivent pas approcher du seuil : c'est toute la
    // différence avec l'ancien compteur, qui comptait chaque tentative avant
    // même de vérifier le mot de passe.
    for (let i = 0; i < 1000; i++) isRateLimited("k", 10);
    expect(isRateLimited("k", 10)).toBe(false);
  });

  it("une réussite efface l'ardoise", () => {
    for (let i = 0; i < 9; i++) recordFailure("k", FENETRE);
    clearFailures("k");
    expect(isRateLimited("k", 1)).toBe(false);
  });

  it("les compteurs sont indépendants", () => {
    for (let i = 0; i < 10; i++) recordFailure("k", FENETRE);
    expect(isRateLimited("autre", 10)).toBe(false);
  });

  it("la fenêtre expirée repart de zéro", () => {
    recordFailure("k", -1); // déjà expirée
    recordFailure("k", FENETRE);
    expect(isRateLimited("k", 2)).toBe(false);
  });
});

describe("clientIp", () => {
  const h = (v: Record<string, string>) => new Headers(v);

  it("retient la DERNIÈRE entrée : les précédentes viennent du client", () => {
    // Un attaquant écrit ce qu'il veut à gauche ; le relais ajoute à droite.
    expect(clientIp(h({ "x-forwarded-for": "1.1.1.1, 203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("supporte une chaîne à une seule entrée", () => {
    expect(clientIp(h({ "x-forwarded-for": "203.0.113.7" }))).toBe("203.0.113.7");
  });

  it("se rabat sur x-real-ip", () => {
    expect(clientIp(h({ "x-real-ip": "203.0.113.9" }))).toBe("203.0.113.9");
  });

  it("ne prétend pas savoir quand rien n'est fourni", () => {
    expect(clientIp(h({}))).toBe("unknown");
  });
});
