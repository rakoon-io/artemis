import { Role } from "@prisma/client";

/**
 * RBAC centralisé (voir ADR-0003). « L'UI masque, le serveur impose. »
 * Toute mutation serveur DOIT appeler ces fonctions avant d'agir.
 */

export interface PolicyUser {
  id: string;
  role: Role;
}

export interface TicketOwnership {
  reporterId: string;
  assigneeId: string | null;
}

export function isAdmin(user: PolicyUser | null | undefined): boolean {
  return user?.role === Role.ADMIN;
}

/** Actions d'administration réservées à l'Admin. */
export type AdminAction =
  | "manage_project"
  | "manage_columns"
  | "manage_sprints"
  | "manage_labels"
  | "manage_users"
  | "manage_members"
  | "delete_ticket";

export function can(user: PolicyUser | null | undefined, _action: AdminAction): boolean {
  return isAdmin(user);
}

/**
 * Accès à un projet : un administrateur accède à tous les projets ; un autre
 * utilisateur doit en être membre. `isMember` est calculé côté serveur (DB) puis
 * passé ici pour garder cette fonction pure et testable.
 */
export function canAccessProject(
  user: PolicyUser | null | undefined,
  isMember: boolean,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return isMember;
}

/** Tout utilisateur connecté peut créer un ticket / commenter. */
export function canCreateTicket(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

export function canComment(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

/** Admin édite tout ; le Rapporteur uniquement ses tickets (rapporteur ou assigné). */
export function canEditTicket(
  user: PolicyUser | null | undefined,
  ticket: TicketOwnership,
): boolean {
  if (!user) return false;
  if (isAdmin(user)) return true;
  return ticket.reporterId === user.id || ticket.assigneeId === user.id;
}

/** Déplacement Kanban : mêmes règles que l'édition. */
export function canMoveTicket(
  user: PolicyUser | null | undefined,
  ticket: TicketOwnership,
): boolean {
  return canEditTicket(user, ticket);
}

/** Erreur d'autorisation (à mapper en 403 côté API / action). */
export class ForbiddenError extends Error {
  constructor(message = "Action non autorisée") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export function assert(condition: boolean, message?: string): asserts condition {
  if (!condition) throw new ForbiddenError(message);
}
