import { describe, it, expect } from "vitest";
import {
  createComponentSchema,
  createTicketSchema,
  ticketDraftSchema,
  updateComponentSchema,
  updateTicketSchema,
} from "./validators";

/**
 * Schémas du catalogue de composants. Le point délicat est la sémantique de la
 * `description` : à la création, « absente » vaut « aucune » ; à la mise à jour,
 * `undefined` doit signifier « ne pas toucher » et une chaîne vide « effacer ».
 * Confondre les deux effacerait silencieusement la description à chaque édition
 * qui ne renseigne pas le champ.
 */

const base = { projectId: "p1", name: "Tableau Kanban", kind: "PAGE", color: "#8B5CF6" };

describe("createComponentSchema", () => {
  it("accepte un composant minimal et normalise l'absence de description en null", () => {
    const parsed = createComponentSchema.parse(base);
    expect(parsed).toMatchObject({ name: "Tableau Kanban", kind: "PAGE" });
    expect(parsed.description).toBeNull();
  });

  it("normalise une description vide ou blanche en null", () => {
    expect(createComponentSchema.parse({ ...base, description: "" }).description).toBeNull();
    expect(createComponentSchema.parse({ ...base, description: "   " }).description).toBeNull();
  });

  it("conserve et détoure une description renseignée", () => {
    expect(
      createComponentSchema.parse({ ...base, description: "  Vue Kanban.  " }).description,
    ).toBe("Vue Kanban.");
  });

  it("détoure le nom et refuse un nom vide", () => {
    expect(createComponentSchema.parse({ ...base, name: "  Wiki  " }).name).toBe("Wiki");
    expect(() => createComponentSchema.parse({ ...base, name: "   " })).toThrow();
  });

  it("refuse une nature hors énumération", () => {
    expect(() => createComponentSchema.parse({ ...base, kind: "WIDGET" })).toThrow();
  });

  it("accepte les trois natures du schéma", () => {
    for (const kind of ["PAGE", "SHARED", "SERVICE"]) {
      expect(createComponentSchema.parse({ ...base, kind }).kind).toBe(kind);
    }
  });

  it("refuse une couleur non hexadécimale et borne les longueurs", () => {
    expect(() => createComponentSchema.parse({ ...base, color: "violet" })).toThrow();
    expect(() => createComponentSchema.parse({ ...base, name: "x".repeat(61) })).toThrow();
    expect(() =>
      createComponentSchema.parse({ ...base, description: "x".repeat(501) }),
    ).toThrow();
  });
});

describe("updateComponentSchema", () => {
  it("laisse la description intacte quand le champ est absent", () => {
    // `undefined` ne doit PAS devenir `null` : le service ne touchera pas au champ.
    const parsed = updateComponentSchema.parse({ id: "c1", name: "Wiki" });
    expect(parsed.description).toBeUndefined();
    expect("description" in parsed && parsed.description !== undefined).toBe(false);
  });

  it("efface la description sur chaîne vide ou null explicite", () => {
    expect(updateComponentSchema.parse({ id: "c1", description: "" }).description).toBeNull();
    expect(updateComponentSchema.parse({ id: "c1", description: null }).description).toBeNull();
  });

  it("permet une mise à jour partielle de la seule nature", () => {
    const parsed = updateComponentSchema.parse({ id: "c1", kind: "SERVICE" });
    expect(parsed).toMatchObject({ id: "c1", kind: "SERVICE" });
    expect(parsed.name).toBeUndefined();
    expect(parsed.color).toBeUndefined();
  });
});

describe("componentId sur les schémas de ticket", () => {
  it("est facultatif à la création et accepte null (aucun composant)", () => {
    const input = { projectId: "p1", title: "Titre" };
    expect(createTicketSchema.parse(input).componentId).toBeUndefined();
    expect(
      createTicketSchema.parse({ ...input, componentId: null }).componentId,
    ).toBeNull();
    expect(
      createTicketSchema.parse({ ...input, componentId: "c1" }).componentId,
    ).toBe("c1");
  });

  it("distingue « ne pas toucher » (absent) de « détacher » (null) à la mise à jour", () => {
    expect(updateTicketSchema.parse({ id: "t1" }).componentId).toBeUndefined();
    expect(
      updateTicketSchema.parse({ id: "t1", componentId: null }).componentId,
    ).toBeNull();
  });

  it("refuse la chaîne vide, qui violerait la clé étrangère en base", () => {
    // Une chaîne vide est « fausse » : elle passerait le garde-fou de cohérence
    // projet des services (`if (componentId)`) et partirait telle quelle en base.
    // Le refus doit donc avoir lieu ici, à la frontière.
    expect(() =>
      createTicketSchema.parse({ projectId: "p1", title: "T", componentId: "" }),
    ).toThrow();
    expect(() =>
      updateTicketSchema.parse({ id: "t1", componentId: "" }),
    ).toThrow();
    expect(() =>
      ticketDraftSchema.parse({ title: "T", componentId: "" }),
    ).toThrow();
  });

  it("est accepté sur un brouillon issu de l'IA", () => {
    const draft = { title: "Corriger le drag & drop" };
    expect(ticketDraftSchema.parse(draft).componentId).toBeUndefined();
    expect(
      ticketDraftSchema.parse({ ...draft, componentId: null }).componentId,
    ).toBeNull();
    expect(
      ticketDraftSchema.parse({ ...draft, componentId: "c1" }).componentId,
    ).toBe("c1");
  });
});
