import { isAdmin } from "@/lib/policies";
import { rankAfter } from "@/lib/rank";
import { canAccess } from "@/server/access";
import { listColumns } from "@/server/services/column.service";
import { createComment } from "@/server/services/comment.service";
import { listAccessibleProjectIds } from "@/server/services/membership.service";
import { getProjectByKey, listProjects } from "@/server/services/project.service";
import { listTicketPriorities } from "@/server/services/ticketpriority.service";
import { listTicketTypes } from "@/server/services/tickettype.service";
import {
  createTicket,
  moveTicket,
  updateTicket,
} from "@/server/services/ticket.service";
import { notifyNewComment, notifyTicketAssigned } from "@/server/notifications";
import type { Actor } from "./actor";
import {
  findUserIdByEmail,
  getTicketByKey,
  lastRankInColumn,
  listProjectTickets,
} from "./repo";

/**
 * Logique du serveur MCP avec autorisation (equivalent de la couche actions du
 * web). Regles : l'acteur doit avoir acces au projet (membre ou admin) ; il ne
 * modifie/deplace que les tickets qui lui sont assignes ; il ne prend en charge
 * qu'un ticket libre (ou deja le sien). Il peut lire et commenter tout ticket
 * accessible.
 */

type Column = { id: string; name: string; order: number };

const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 25;

function clampLimit(limit?: number): number {
  if (!limit || limit < 1) return DEFAULT_LIMIT;
  return Math.min(MAX_LIMIT, Math.floor(limit));
}

/** Element nomme par nom (exact insensible a la casse, sinon sous-chaine). */
function matchByName<T extends { name: string }>(
  items: T[],
  name: string,
): T | undefined {
  const s = name.trim().toLowerCase();
  return (
    items.find((i) => i.name.toLowerCase() === s) ??
    items.find((i) => i.name.toLowerCase().includes(s))
  );
}

/** Colonne par nom (exact insensible a la casse, sinon sous-chaine). */
function matchColumn(cols: Column[], status: string): Column | undefined {
  return matchByName(cols, status);
}

/** Colonne « en cours » (meilleur effort) pour la prise en charge. */
function inProgressColumn(cols: Column[]): Column | undefined {
  return cols.find((c) => /(en cours|in progress|doing|wip|progress)/i.test(c.name));
}

async function requireProject(actor: Actor, projectKey: string) {
  const project = await getProjectByKey(projectKey);
  if (!project) throw new Error(`Projet introuvable : ${projectKey}.`);
  if (!(await canAccess(actor, project.id))) {
    throw new Error(`Acces refuse au projet ${projectKey}.`);
  }
  return project;
}

async function requireTicket(actor: Actor, key: string) {
  const ticket = await getTicketByKey(key);
  if (!ticket) throw new Error(`Ticket introuvable : ${key}.`);
  if (!(await canAccess(actor, ticket.project.id))) {
    throw new Error(`Acces refuse au ticket ${key}.`);
  }
  return ticket;
}

/** L'acteur doit etre l'assigne du ticket pour le modifier. */
function requireOwned(
  actor: Actor,
  ticket: { assignee: { id: string } | null },
  key: string,
): void {
  if (ticket.assignee?.id !== actor.id) {
    throw new Error(
      `Prends d'abord en charge le ticket ${key} (take_ticket) avant de le modifier.`,
    );
  }
}

function personName(u: { name: string | null; email: string } | null): string | null {
  return u ? (u.name?.trim() || u.email) : null;
}

/** Projets accessibles a l'acteur. */
export async function mcpListProjects(actor: Actor) {
  const all = await listProjects();
  const projects = isAdmin(actor)
    ? all
    : await (async () => {
        const ids = new Set(await listAccessibleProjectIds(actor.id));
        return all.filter((p) => ids.has(p.id));
      })();
  return projects.map((p) => ({
    key: p.key,
    name: p.name,
    description: p.description ?? null,
  }));
}

/** Statuts (colonnes) d'un projet, dans l'ordre du workflow. */
export async function mcpListStatuses(actor: Actor, projectKey: string) {
  const project = await requireProject(actor, projectKey);
  const cols = await listColumns(project.id);
  return cols.map((c) => c.name);
}

export interface ListTicketsArgs {
  projectKey: string;
  status?: string;
  assignee?: string; // "me" | "unassigned" | e-mail
  limit?: number;
}

/** Tickets d'un projet (filtres statut / assigne optionnels). */
export async function mcpListTickets(actor: Actor, args: ListTicketsArgs) {
  const project = await requireProject(actor, args.projectKey);
  const cols = await listColumns(project.id);

  let columnId: string | undefined;
  if (args.status) {
    const col = matchColumn(cols, args.status);
    if (!col) {
      throw new Error(
        `Statut inconnu : "${args.status}". Statuts disponibles : ${cols.map((c) => c.name).join(", ")}.`,
      );
    }
    columnId = col.id;
  }

  let assigneeId: string | null | undefined;
  if (args.assignee === "me") assigneeId = actor.id;
  else if (args.assignee === "unassigned") assigneeId = null;
  else if (args.assignee) {
    assigneeId = (await findUserIdByEmail(args.assignee)) ?? "__none__";
  }

  const rows = await listProjectTickets(project.id, {
    columnId,
    assigneeId,
    limit: clampLimit(args.limit),
  });
  return rows.map((t) => ({
    key: t.key,
    title: t.title,
    status: t.column.name,
    type: t.type.name,
    priority: t.priority.name,
    assignee: personName(t.assignee),
  }));
}

/** Detail complet d'un ticket (description, commentaires, etc.). */
export async function mcpGetTicket(actor: Actor, key: string) {
  const t = await requireTicket(actor, key);
  return {
    key: t.key,
    title: t.title,
    description: t.description ?? "",
    project: t.project.key,
    status: t.column.name,
    type: t.type.name,
    priority: t.priority.name,
    reporter: personName(t.reporter),
    assignee: personName(t.assignee),
    assignedToMe: t.assignee?.id === actor.id,
    sprint: t.sprint?.name ?? null,
    labels: t.labels.map((l) => l.label.name),
    attachments: t.attachments.map((a) => a.filename),
    comments: t.comments.map((c) => ({
      author: personName(c.author) ?? "Inconnu",
      body: c.body,
      at: c.createdAt.toISOString(),
    })),
  };
}

export interface CreateTicketArgs {
  projectKey: string;
  title: string;
  description?: string;
  type?: string; // nom du type ; a defaut : type par defaut du projet
  priority?: string; // nom de la priorite ; a defaut : priorite par defaut
  assignee?: string; // "me" | e-mail ; a defaut : non assigne
}

/**
 * Cree un ticket dans la 1re colonne du projet (l'acteur en est le rapporteur).
 * Type / priorite sont resolus par nom au sein du projet ; sans valeur, le
 * service applique les valeurs par defaut du projet. Requiert l'acces au projet.
 */
export async function mcpCreateTicket(actor: Actor, args: CreateTicketArgs) {
  const project = await requireProject(actor, args.projectKey);
  const title = args.title.trim();
  if (!title) throw new Error("Le titre du ticket est obligatoire.");

  let typeId: string | undefined;
  if (args.type) {
    const types = await listTicketTypes(project.id);
    const match = matchByName(types, args.type);
    if (!match) {
      throw new Error(
        `Type inconnu : "${args.type}". Types disponibles : ${types.map((t) => t.name).join(", ")}.`,
      );
    }
    typeId = match.id;
  }

  let priorityId: string | undefined;
  if (args.priority) {
    const priorities = await listTicketPriorities(project.id);
    const match = matchByName(priorities, args.priority);
    if (!match) {
      throw new Error(
        `Priorite inconnue : "${args.priority}". Priorites disponibles : ${priorities.map((p) => p.name).join(", ")}.`,
      );
    }
    priorityId = match.id;
  }

  let assigneeId: string | null = null;
  if (args.assignee === "me") {
    assigneeId = actor.id;
  } else if (args.assignee) {
    assigneeId = await findUserIdByEmail(args.assignee);
    if (!assigneeId) {
      throw new Error(`Aucun utilisateur avec l'e-mail "${args.assignee}".`);
    }
  }

  const ticket = await createTicket(
    {
      projectId: project.id,
      title,
      description: args.description?.trim() || null,
      typeId,
      priorityId,
      assigneeId,
    },
    actor.id,
  );
  // Notifie l'assigne (fire-and-forget) si ce n'est pas l'acteur lui-meme.
  void notifyTicketAssigned(ticket.id, assigneeId, actor.id);
  return {
    ok: true,
    key: ticket.key,
    title: ticket.title,
    status: ticket.column.name,
    type: ticket.type.name,
    priority: ticket.priority.name,
    assignee: personName(ticket.assignee),
    message: `Ticket ${ticket.key} cree.`,
  };
}

/** Prend en charge un ticket : se l'assigner et le passer « en cours ». */
export async function mcpTakeTicket(actor: Actor, key: string) {
  const t = await requireTicket(actor, key);
  if (t.assignee && t.assignee.id !== actor.id) {
    throw new Error(
      `Ticket ${key} deja pris en charge par ${personName(t.assignee)}.`,
    );
  }
  await updateTicket({ id: t.id, assigneeId: actor.id });

  let status = t.column.name;
  const cols = await listColumns(t.project.id);
  const target = inProgressColumn(cols);
  if (target && target.id !== t.column.id) {
    const rank = rankAfter(await lastRankInColumn(target.id));
    await moveTicket(t.id, target.id, rank);
    status = target.name;
  }
  return {
    ok: true,
    key,
    message: `Ticket ${key} pris en charge.`,
    assignee: actor.name?.trim() || actor.email,
    status,
  };
}

/** Deplace un ticket vers un statut (colonne). Reserve a l'assigne (l'acteur). */
export async function mcpMoveTicket(actor: Actor, key: string, status: string) {
  const t = await requireTicket(actor, key);
  requireOwned(actor, t, key);
  const cols = await listColumns(t.project.id);
  const col = matchColumn(cols, status);
  if (!col) {
    throw new Error(
      `Statut inconnu : "${status}". Statuts disponibles : ${cols.map((c) => c.name).join(", ")}.`,
    );
  }
  const rank = rankAfter(await lastRankInColumn(col.id));
  await moveTicket(t.id, col.id, rank);
  return { ok: true, key, message: `Ticket ${key} deplace vers "${col.name}".`, status: col.name };
}

/** Ajoute un commentaire (sur tout ticket accessible). */
export async function mcpCommentTicket(actor: Actor, key: string, body: string) {
  const t = await requireTicket(actor, key);
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Le commentaire est vide.");
  const c = await createComment(t.id, actor.id, trimmed);
  void notifyNewComment(t.id, actor.id, trimmed);
  return { ok: true, key, message: `Commentaire ajoute sur ${key}.`, commentId: c.id };
}

export interface UpdateTicketArgs {
  title?: string;
  description?: string;
}

/** Met a jour titre / description. Reserve a l'assigne (l'acteur). */
export async function mcpUpdateTicket(
  actor: Actor,
  key: string,
  args: UpdateTicketArgs,
) {
  const t = await requireTicket(actor, key);
  requireOwned(actor, t, key);
  if (args.title === undefined && args.description === undefined) {
    throw new Error("Rien a mettre a jour (fournir title et/ou description).");
  }
  await updateTicket({
    id: t.id,
    ...(args.title !== undefined ? { title: args.title } : {}),
    ...(args.description !== undefined ? { description: args.description } : {}),
  });
  return { ok: true, key, message: `Ticket ${key} mis a jour.` };
}
