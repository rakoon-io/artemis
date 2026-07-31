import { describe, expect, it } from "vitest";
import { nouveauNonce, politiqueImposee, politiqueObservee } from "./csp";

describe("politiqueImposee", () => {
  it("porte le jeton dans script-src", () => {
    expect(politiqueImposee("ABC123")).toContain("script-src 'self' 'nonce-ABC123'");
  });

  it("N'A PLUS unsafe-inline dans script-src", () => {
    /**
     * Le point de tout le chantier. Tant que `script-src` portait
     * `unsafe-inline`, il autorisait aussi le script qu'un attaquant
     * parviendrait à écrire dans la page : la directive était présente et ne
     * protégeait de rien.
     */
    const scriptSrc = politiqueImposee("ABC123")
      .split("; ")
      .find((d) => d.startsWith("script-src "));
    expect(scriptSrc).toBeDefined();
    expect(scriptSrc).not.toContain("unsafe-inline");
    expect(scriptSrc).not.toContain("unsafe-eval");
  });

  it("ferme les portes qui ne coûtent rien", () => {
    const p = politiqueImposee("X");
    expect(p).toContain("object-src 'none'");
    expect(p).toContain("frame-ancestors 'none'");
    expect(p).toContain("base-uri 'self'");
    expect(p).toContain("form-action 'self'");
    expect(p).toContain("default-src 'self'");
  });

  it("garde unsafe-inline pour les STYLES, et l'assume", () => {
    /**
     * Mesuré au navigateur sur neuf pages authentifiées : 269 attributs `style`
     * en ligne et 18 éléments `<style>`, posés par les surfaces flottantes
     * (Radix) et le glisser-déposer. Fermer cette porte-là n'est pas une ligne
     * de configuration, c'est réécrire leur positionnement.
     */
    expect(politiqueImposee("X")).toContain("style-src 'self' 'unsafe-inline'");
  });
});

describe("politiqueObservee", () => {
  it("est plus stricte que l'imposée, sinon elle n'apprend rien", () => {
    const observee = politiqueObservee("X");
    expect(observee).toContain("style-src 'self' 'nonce-X'");
    expect(observee).not.toContain("unsafe-inline");
    // Les images de tiers : ce que l'imposée laisse passer, l'observée compte.
    expect(politiqueImposee("X")).toContain("https:");
    expect(observee).not.toContain("https:");
  });

  it("n'impose pas upgrade-insecure-requests", () => {
    // Une politique en observation l'ignore - le navigateur le dit à chaque
    // page - et l'imposer casserait le développement sur http://localhost.
    expect(politiqueObservee("X")).not.toContain("upgrade-insecure-requests");
  });
});

describe("nouveauNonce", () => {
  it("change à chaque appel", () => {
    // Tout l'édifice tient à l'imprévisibilité : un jeton réutilisé d'une page
    // à l'autre serait un jeton que l'attaquant a déjà lu.
    const tires = new Set(Array.from({ length: 200 }, () => nouveauNonce()));
    expect(tires.size).toBe(200);
  });

  it("fait seize octets, comme le recommande la spécification", () => {
    // 16 octets → 24 caractères en base64, dont deux de remplissage.
    const n = nouveauNonce();
    expect(n).toHaveLength(24);
    expect(Buffer.from(n, "base64")).toHaveLength(16);
  });

  it("ne contient rien qui casserait l'en-tête", () => {
    // Un `'` ou un `;` dans le jeton découperait la directive en deux.
    for (let i = 0; i < 100; i++) {
      expect(nouveauNonce()).toMatch(/^[A-Za-z0-9+/]+={0,2}$/);
    }
  });
});
