import { describe, it, expect } from "vitest";
import { Role } from "@prisma/client";
import {
  isAdmin,
  can,
  canAccessProject,
  canCreateTicket,
  canEditComment,
  canEditTicket,
  canMoveTicket,
  canProposeTaxonomy,
} from "./policies";

const admin = { id: "u-admin", role: Role.ADMIN };
const reporter = { id: "u-rep", role: Role.REPORTER };
const other = { id: "u-other", role: Role.REPORTER };

describe("policies (RBAC)", () => {
  it("isAdmin distingue les rôles", () => {
    expect(isAdmin(admin)).toBe(true);
    expect(isAdmin(reporter)).toBe(false);
    expect(isAdmin(null)).toBe(false);
  });

  it("les actions d'administration sont réservées à l'Admin", () => {
    expect(can(admin, "manage_columns")).toBe(true);
    expect(can(reporter, "manage_columns")).toBe(false);
    expect(can(reporter, "delete_ticket")).toBe(false);
  });

  it("tout utilisateur connecté peut créer un ticket", () => {
    expect(canCreateTicket(reporter)).toBe(true);
    expect(canCreateTicket(null)).toBe(false);
  });

  it("l'édition d'un ticket suit l'appartenance (rapporteur ou assigné), l'Admin passe partout", () => {
    const ticket = { reporterId: reporter.id, assigneeId: null };
    expect(canEditTicket(reporter, ticket)).toBe(true); // rapporteur
    expect(canEditTicket(other, ticket)).toBe(false); // tiers
    expect(canEditTicket(admin, ticket)).toBe(true); // admin

    const assigned = { reporterId: "someone", assigneeId: other.id };
    expect(canEditTicket(other, assigned)).toBe(true); // assigné
  });

  it("le déplacement Kanban suit les mêmes règles que l'édition", () => {
    const ticket = { reporterId: reporter.id, assigneeId: null };
    expect(canMoveTicket(reporter, ticket)).toBe(true);
    expect(canMoveTicket(other, ticket)).toBe(false);
    expect(canMoveTicket(admin, ticket)).toBe(true);
  });

  it("l'accès projet : l'Admin passe partout, le Rapporteur seulement s'il est membre", () => {
    // Admin : accès quel que soit le statut de membre.
    expect(canAccessProject(admin, false)).toBe(true);
    expect(canAccessProject(admin, true)).toBe(true);
    // Rapporteur : uniquement membre.
    expect(canAccessProject(reporter, true)).toBe(true);
    expect(canAccessProject(reporter, false)).toBe(false);
    // Non connecté : jamais.
    expect(canAccessProject(null, true)).toBe(false);
  });

  it("proposer une brique de structure est ouvert à tout utilisateur connecté", () => {
    // C'est le point de la fonctionnalité : un rapporteur PROPOSE, il ne
    // configure pas. La validation, elle, reste une action d'administration.
    expect(canProposeTaxonomy(reporter)).toBe(true);
    expect(canProposeTaxonomy(admin)).toBe(true);
    expect(canProposeTaxonomy(null)).toBe(false);
    expect(canProposeTaxonomy(undefined)).toBe(false);
  });

  it("valider une proposition et configurer la structure restent réservés à l'Admin", () => {
    for (const action of [
      "review_proposals",
      "manage_modules",
      "manage_components",
    ] as const) {
      expect(can(admin, action)).toBe(true);
      expect(can(reporter, action)).toBe(false);
      expect(can(null, action)).toBe(false);
    }
  });

  it("un commentaire ne se retouche que par son auteur, l'Admin compris", () => {
    const mine = { authorId: reporter.id };
    expect(canEditComment(reporter, mine)).toBe(true);

    // Le point de la règle : retoucher la parole d'autrui n'est pas une
    // prérogative d'administration, c'est lui faire dire autre chose.
    expect(canEditComment(admin, mine)).toBe(false);
    expect(canEditComment(other, mine)).toBe(false);
    expect(canEditComment(null, mine)).toBe(false);
    expect(canEditComment(undefined, mine)).toBe(false);
  });
});
