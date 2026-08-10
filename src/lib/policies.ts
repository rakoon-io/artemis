import { Role } from "@prisma/client";

/**
 * RBAC centralisé. « L'UI masque, le serveur impose. »
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
  | "manage_modules"
  | "manage_components"
  | "review_proposals"
  | "manage_specs"
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

/**
 * PROPOSER une brique de structure (module, composant) : ouvert à tout membre du
 * projet, rapporteurs compris. La proposition ne devient utilisable qu'une fois
 * VALIDÉE par un administrateur (`review_proposals`) - c'est la validation qui la
 * fait exister pour les tickets, l'IA et le serveur MCP.
 *
 * L'appartenance au projet n'est pas vérifiable ici (cette fonction reste pure) :
 * les actions appellent `assertProjectAccess` en complément.
 */
export function canProposeTaxonomy(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

/** Tout utilisateur connecté peut créer un ticket / commenter. */
export function canCreateTicket(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

export function canComment(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

/**
 * Retoucher un commentaire : SON AUTEUR, et lui seul - l'administrateur non
 * plus. Corriger la parole d'autrui n'est pas administrer le projet, c'est lui
 * faire dire autre chose. Un propos à retirer se supprime ; il ne se réécrit pas
 * au nom de quelqu'un d'autre.
 */
export function canEditComment(
  user: PolicyUser | null | undefined,
  comment: { authorId: string },
): boolean {
  if (!user) return false;
  return comment.authorId === user.id;
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

/**
 * JOINDRE UN FICHIER À UN TICKET : contribuer, et non modifier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE N'EST PAS `canEditTicket`
 *
 * Le dépôt était réservé au rapporteur du ticket, à son assigné et aux
 * administrateurs. Un collègue qui reproduisait le défaut ne pouvait donc pas
 * y verser sa capture d'écran : il lui restait à la décrire en toutes lettres,
 * ou à demander à quelqu'un d'autre de la déposer. C'est précisément la
 * personne la mieux placée pour documenter que l'on faisait taire.
 *
 * Or joindre un fichier ne MODIFIE rien de ce qu'un autre a écrit : cela ajoute
 * une pièce, signée de son déposant (`uploadedById`), à côté du reste. C'est le
 * geste du commentaire, pas celui de l'édition - et le commentaire, lui, est
 * ouvert à tout membre du projet depuis toujours (`canComment`).
 *
 * L'accès au PROJET reste exigé, et il l'est séparément, par
 * `assertProjectAccess` chez tous les appelants : cette fonction-ci ne répond
 * qu'à « ce rôle a-t-il le droit de contribuer ? ».
 */
export function canAttachToTicket(user: PolicyUser | null | undefined): boolean {
  return !!user;
}

/**
 * RETIRER une pièce jointe : son déposant, ou qui peut éditer le ticket.
 *
 * Le dépôt s'ouvre, le retrait non. Ce sont deux gestes de nature opposée :
 * l'un ajoute et se signe, l'autre efface définitivement le travail d'un tiers
 * - et depuis que la suppression emporte aussi les octets (cf. `forgetObjects`),
 * il n'y a plus de fichier à retrouver dans le seau après coup.
 *
 * Chacun reste donc maître de ce qu'il a déposé, et ceux qui répondent du
 * ticket - rapporteur, assigné, administrateur - peuvent faire le ménage. La
 * symétrie avec les commentaires est voulue : on écrit chez les autres, on
 * n'efface que chez soi.
 */
export function canRemoveAttachment(
  user: PolicyUser | null | undefined,
  attachment: { uploadedById: string },
  ticket: TicketOwnership,
): boolean {
  if (!user) return false;
  if (attachment.uploadedById === user.id) return true;
  return canEditTicket(user, ticket);
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
