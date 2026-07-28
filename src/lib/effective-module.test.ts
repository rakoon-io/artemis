import { describe, it, expect } from "vitest";
import { effectiveModule, moduleIdForTicket } from "./effective-module";

const suivi = { id: "m1", name: "Suivi des tickets", color: "#2563EB" };
const admin = { id: "m2", name: "Administration", color: "#0891B2" };

describe("effectiveModule", () => {
  it("prend le module du composant quand le ticket en a un", () => {
    expect(
      effectiveModule({ component: { module: suivi }, module: null }),
    ).toEqual(suivi);
  });

  it("retombe sur le module propre du ticket sans composant", () => {
    expect(effectiveModule({ component: null, module: admin })).toEqual(admin);
  });

  it("renvoie null quand rien n'est rattaché", () => {
    expect(effectiveModule({})).toBeNull();
    expect(effectiveModule({ component: null, module: null })).toBeNull();
    expect(effectiveModule({ component: { module: null }, module: null })).toBeNull();
  });

  it("le composant PRIME sur le module propre, même si les deux sont présents", () => {
    // Cette combinaison ne devrait pas exister (l'invariant l'interdit), mais une
    // donnée importée ou écrite en SQL direct pourrait la produire : on affiche
    // alors le module du composant, celui que l'utilisateur voit à l'écran.
    expect(
      effectiveModule({ component: { module: suivi }, module: admin }),
    ).toEqual(suivi);
  });

  it("un composant sans module ne fait PAS retomber sur le module du ticket", () => {
    // Autre cas de donnée incohérente : le composant fait autorité, y compris
    // quand il n'a pas de module. Sinon on afficherait un module que le composant
    // choisi contredit.
    expect(
      effectiveModule({ component: { module: null }, module: admin }),
    ).toBeNull();
  });
});

describe("moduleIdForTicket (invariant avant écriture)", () => {
  it("efface le module propre dès qu'un composant est posé", () => {
    expect(moduleIdForTicket("c1", "m1")).toBeNull();
    expect(moduleIdForTicket("c1", null)).toBeNull();
    // Même quand l'appelant ne touchait pas au champ : l'invariant s'impose.
    expect(moduleIdForTicket("c1", undefined)).toBeNull();
  });

  it("conserve le module propre en l'absence de composant", () => {
    expect(moduleIdForTicket(null, "m1")).toBe("m1");
    expect(moduleIdForTicket(undefined, "m1")).toBe("m1");
  });

  it("préserve `undefined` sans composant : le champ n'est pas touché", () => {
    // Distinction essentielle en mise à jour partielle : `undefined` ne doit pas
    // devenir `null`, sinon toute édition effacerait le module du ticket.
    expect(moduleIdForTicket(null, undefined)).toBeUndefined();
    expect(moduleIdForTicket(undefined, undefined)).toBeUndefined();
  });

  it("propage un détachement explicite", () => {
    expect(moduleIdForTicket(null, null)).toBeNull();
  });
});
