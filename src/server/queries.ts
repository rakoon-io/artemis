import * as columnService from "./services/column.service";
import * as labelService from "./services/label.service";
import * as projectService from "./services/project.service";
import * as sprintService from "./services/sprint.service";
import * as ticketService from "./services/ticket.service";
import * as userService from "./services/user.service";
import type { TicketFilters } from "./services/ticket.service";

/**
 * Couche lecture pour les Server Components : enveloppe les services (aucune écriture).
 * Aucune requête Prisma directe ici — tout passe par `services/*`.
 */

export function getProjects() {
  return projectService.listProjects();
}

export function getProjectByKey(key: string) {
  return projectService.getProjectByKey(key);
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

export function getLabels(projectId: string) {
  return labelService.listLabels(projectId);
}

export function getMembers() {
  return userService.listUsers();
}
