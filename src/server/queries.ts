import { isAdmin, type PolicyUser } from "@/lib/policies";
import * as columnService from "./services/column.service";
import * as emailLogService from "./services/email-log.service";
import * as labelService from "./services/label.service";
import * as membershipService from "./services/membership.service";
import * as projectService from "./services/project.service";
import * as sprintService from "./services/sprint.service";
import * as ticketService from "./services/ticket.service";
import * as ticketPriorityService from "./services/ticketpriority.service";
import * as ticketTypeService from "./services/tickettype.service";
import * as userService from "./services/user.service";
import * as wikiService from "./services/wiki.service";
import type { TicketFilters } from "./services/ticket.service";

/**
 * Couche lecture pour les Server Components : enveloppe les services (aucune écriture).
 * Aucune requête Prisma directe ici - tout passe par `services/*`.
 */

export function getProjects() {
  return projectService.listProjects();
}

/** Projets avec statistiques (pour les cartes de la liste). */
export function getProjectsWithStats() {
  return projectService.listProjectsWithStats();
}

/**
 * Projets accessibles avec statistiques : un administrateur voit tout ; un autre
 * utilisateur ne voit que les projets dont il est membre (aucun s'il n'en a pas).
 */
export async function getAccessibleProjectsWithStats(
  user: PolicyUser | null | undefined,
) {
  if (isAdmin(user)) return projectService.listProjectsWithStats();
  if (!user) return [];
  const ids = await membershipService.listAccessibleProjectIds(user.id);
  return projectService.listProjectsWithStats(ids);
}

export function getProjectByKey(key: string) {
  return projectService.getProjectByKey(key);
}

/** Tous les utilisateurs avec leur appartenance au projet (onglet Membres). */
export function getProjectMembersView(projectId: string) {
  return membershipService.listProjectMembersView(projectId);
}

/** Journal des e-mails (suivi des envois), plus récents d'abord. */
export function getEmailLog(limit = 200) {
  return emailLogService.listEmails(limit);
}

/** Colonnes ordonnées + leurs tickets ordonnés par rang (avec assignee/labels). */
export async function getBoardData(projectId: string) {
  const [columns, tickets] = await Promise.all([
    columnService.listColumns(projectId),
    ticketService.listBoardTickets(projectId),
  ]);
  return {
    columns: columns.map((column) => ({
      ...column,
      tickets: tickets.filter((ticket) => ticket.columnId === column.id),
    })),
  };
}

export function getTicketsList(projectId: string, filters: TicketFilters = {}) {
  return ticketService.listTickets(projectId, filters);
}

export function getTicketDetail(id: string) {
  return ticketService.getTicketById(id);
}

export function getSprints(projectId: string) {
  return sprintService.listSprints(projectId);
}

/** Sprints avec leurs tickets (vue Sprints). */
export function getSprintsWithTickets(projectId: string) {
  return sprintService.listSprintsWithTickets(projectId);
}

/** Tickets sans sprint (backlog), pour la vue Sprints. */
export function getBacklogTickets(projectId: string) {
  return ticketService.listBacklogTickets(projectId);
}

/** Pages de wiki du projet (barre latérale). */
export function getWikiPages(projectId: string) {
  return wikiService.listWikiPages(projectId);
}

/** Une page de wiki avec son contenu. */
export function getWikiPage(id: string) {
  return wikiService.getWikiPage(id);
}

/** Recherche dans les pages de wiki du projet (titre + contenu). */
export function searchWikiPages(projectId: string, query: string) {
  return wikiService.searchWikiPages(projectId, query);
}

/** Clés de tickets du projet, pour lier les citations dans le wiki. */
export function getTicketKeys(projectId: string) {
  return wikiService.listTicketKeys(projectId);
}

/** Références de tickets (id, clé, titre) pour l'autocomplétion « @ » du wiki. */
export function getTicketRefs(projectId: string) {
  return wikiService.listTicketRefs(projectId);
}

export function getLabels(projectId: string) {
  return labelService.listLabels(projectId);
}

/** Types de tickets du projet, ordonnés (badges + configuration). */
export function getTicketTypes(projectId: string) {
  return ticketTypeService.listTicketTypes(projectId);
}

/** Priorités de tickets du projet, ordonnées (badges + configuration). */
export function getTicketPriorities(projectId: string) {
  return ticketPriorityService.listTicketPriorities(projectId);
}

export function getMembers() {
  return userService.listUsers();
}

/** Utilisateurs assignables dans un projet (administrateurs + membres). */
export function getAssignableUsers(projectId: string) {
  return membershipService.listAssignableUsers(projectId);
}
