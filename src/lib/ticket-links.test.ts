import { describe, expect, it } from "vitest";
import {
  isBlocking,
  linkLabelKey,
  refuseLink,
  resolveLinks,
  type StoredLink,
} from "./ticket-links";

describe("linkLabelKey", () => {
  it("dit « bloque » depuis la source et « est bloqué par » depuis la cible", () => {
    expect(linkLabelKey("BLOCKS", "OUT")).toBe("blocks");
    expect(linkLabelKey("BLOCKS", "IN")).toBe("blockedBy");
  });

  it("distingue de la même façon les deux bouts d'un doublon", () => {
    expect(linkLabelKey("DUPLICATES", "OUT")).toBe("duplicates");
    expect(linkLabelKey("DUPLICATES", "IN")).toBe("duplicatedBy");
  });

  it("emploie le même mot des deux côtés d'un lien symétrique", () => {
    expect(linkLabelKey("RELATES", "OUT")).toBe("relates");
    expect(linkLabelKey("RELATES", "IN")).toBe("relates");
  });
});

describe("isBlocking", () => {
  // C'est le sens qui compte : bloquer quelqu'un n'empêche pas d'avancer,
  // être bloqué si.
  it("ne retient que la dépendance SUBIE", () => {
    expect(isBlocking("BLOCKS", "IN")).toBe(true);
    expect(isBlocking("BLOCKS", "OUT")).toBe(false);
    expect(isBlocking("RELATES", "IN")).toBe(false);
    expect(isBlocking("DUPLICATES", "IN")).toBe(false);
  });
});

describe("resolveLinks", () => {
  const lien = (
    id: string,
    sourceId: string,
    targetId: string,
    type: StoredLink["type"],
  ) => ({ id, sourceId, targetId, type, source: sourceId, target: targetId });

  it("regarde chaque lien depuis le ticket demandé, quel que soit le bout écrit", () => {
    const liens = resolveLinks("T1", [
      lien("l1", "T1", "T2", "BLOCKS"),
      lien("l2", "T3", "T1", "BLOCKS"),
    ]);
    const parId = Object.fromEntries(liens.map((l) => [l.id, l]));
    expect(parId.l1.direction).toBe("OUT");
    expect(parId.l1.other).toBe("T2");
    expect(parId.l1.labelKey).toBe("blocks");
    expect(parId.l2.direction).toBe("IN");
    expect(parId.l2.other).toBe("T3");
    expect(parId.l2.labelKey).toBe("blockedBy");
  });

  it("remonte d'abord ce qui empêche d'avancer", () => {
    const liens = resolveLinks("T1", [
      lien("voisin", "T1", "T2", "RELATES"),
      lien("bloquant", "T3", "T1", "BLOCKS"),
      lien("bloque", "T1", "T4", "BLOCKS"),
    ]);
    expect(liens[0].id).toBe("bloquant");
    expect(liens[0].blocking).toBe(true);
    expect(liens.slice(1).every((l) => !l.blocking)).toBe(true);
  });

  it("ne perd aucun lien", () => {
    const liens = resolveLinks("T1", [
      lien("a", "T1", "T2", "RELATES"),
      lien("b", "T2", "T1", "DUPLICATES"),
      lien("c", "T1", "T3", "BLOCKS"),
    ]);
    expect(liens).toHaveLength(3);
  });
});

describe("refuseLink", () => {
  const t = (id: string, projectId = "P1") => ({ id, projectId });

  it("refuse un ticket lié à lui-même", () => {
    expect(refuseLink(t("T1"), t("T1"))).toBe("SELF");
  });

  it("refuse un lien entre deux projets", () => {
    // L'accès se donne projet par projet : une moitié des lecteurs verrait une
    // référence vers un ticket qu'elle n'a pas le droit d'ouvrir.
    expect(refuseLink(t("T1", "P1"), t("T2", "P2"))).toBe("OTHER_PROJECT");
  });

  it("accepte deux tickets distincts du même projet", () => {
    expect(refuseLink(t("T1"), t("T2"))).toBeNull();
  });
});
