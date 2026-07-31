import { isAdmin, type PolicyUser } from "@/lib/policies";
import * as columnService from "./services/column.service";
import * as releaseService from "./services/release.service";
import * as wikiAttachmentService from "./services/wiki-attachment.service";
import * as componentService from "./services/component.service";
import * as emailLogService from "./services/email-log.service";
import * as labelService from "./services/label.service";
import * as membershipService from "./services/membership.service";
import * as moduleService from "./services/module.service";
import * as projectService from "./services/project.service";
import * as sprintService from "./services/sprint.service";
import * as ticketService from "./services/ticket.service";
import * as ticketPriorityService from "./services/ticketpriority.service";
import * as ticketTypeService from "./services/tickettype.service";
import * as userService from "./services/user.service";
import * as wikiService from "./services/wiki.service";
import * as specService from "./services/spec.service";
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

/** Colonnes ordonnées du projet, sans leurs tickets : de quoi peupler un choix
 *  de statut là où l'on ne dessine pas le tableau. */
export function getColumns(projectId: string) {
  return columnService.listColumns(projectId);
}

/** Versions du projet - « à livrer » d'abord, puis les livrées. */
export function getReleases(projectId: string) {
  return releaseService.listReleases(projectId);
}

/** Idem, avec leur contenu et de quoi mesurer l'avancement. */
export function getReleasesWithTickets(projectId: string) {
  return releaseService.listReleasesWithTickets(projectId);
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

/** Tickets rattachés à aucune version, pour la vue Versions. */
export function getTicketsWithoutRelease(projectId: string) {
  return ticketService.listTicketsWithoutRelease(projectId);
}

/** Pages de wiki du projet (barre latérale). */
export function getWikiPages(projectId: string) {
  return wikiService.listWikiPages(projectId);
}

/**
 * Racines des sections predefinies du projet. Trois lignes au plus : c'est tout
 * ce qu'il faut pour ranger l'arbre, l'appartenance des pages se calculant
 * ensuite sans requete (cf. `@/lib/wiki-tree`).
 */
export function getWikiSections(projectId: string) {
  return wikiService.listWikiSections(projectId);
}

/** Sujets declares par une page : modules et composants qu'elle documente. */
export function getWikiPageSubjects(pageId: string) {
  return wikiService.getWikiPageSubjects(pageId);
}

/**
 * Pages documentant un module ou un composant. Sens de lecture INVERSE, celui
 * qui fait du wiki un index du systeme plutot qu'un tas de documents.
 */
export function getPagesDocumenting(subjects: {
  moduleIds?: string[];
  componentIds?: string[];
}) {
  return wikiService.listPagesDocumenting(subjects);
}

/** Index de la documentation du projet : quelles pages decrivent quelle brique. */
export function getDocumentationIndex(projectId: string) {
  return wikiService.listDocumentationIndex(projectId);
}

/** Pieces jointes d'une page : documents deposes et images collees. */
export function getWikiAttachments(pageId: string) {
  return wikiAttachmentService.listWikiAttachments(pageId);
}

/** Une page de wiki avec son contenu. */
export function getWikiPage(id: string) {
  return wikiService.getWikiPage(id);
}

/** Recherche dans les pages de wiki du projet (titre + contenu). */
/**
 * Retrouve une page à partir de ce que porte l'URL : slug courant, ancien slug
 * (favori pris avant un renommage) ou identifiant technique.
 */
export function resolveWikiPage(projectId: string, handle: string) {
  return wikiService.resolveWikiPage(projectId, handle);
}

/** Comptes rendus de réunion du projet, du plus récent au plus ancien. */
export function getMeetingPages(projectId: string) {
  return wikiService.listMeetingPages(projectId);
}

export function searchWikiPages(
  projectId: string,
  query: string,
  page?: number,
) {
  return wikiService.searchWikiPages(projectId, query, page);
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

/**
 * Catalogue de composants du projet, ordonné : les briques applicatives (page,
 * composant réutilisable, service) auxquelles rattacher un ticket pour en
 * contextualiser la demande. Vide tant qu'aucun composant n'est déclaré.
 */
export function getComponents(projectId: string) {
  return componentService.listComponents(projectId);
}

/**
 * Modules fonctionnels du projet, ordonnés : les domaines à grosse maille
 * (« Gestion des utilisateurs ») qui regroupent les composants. Vide tant
 * qu'aucun module n'est déclaré - l'interface masque alors la notion.
 */
export function getModules(projectId: string) {
  return moduleService.listModules(projectId);
}

/** Propositions en attente (modules puis composants), pour la file de validation. */
export function getProposedModules(projectId: string) {
  return moduleService.listProposedModules(projectId);
}

export function getProposedComponents(projectId: string) {
  return componentService.listProposedComponents(projectId);
}

/** Modules avec leurs composants, pour les vues à deux niveaux et le contexte IA. */
export function getModulesWithComponents(projectId: string) {
  return moduleService.listModulesWithComponents(projectId);
}

export function getMembers() {
  return userService.listUsers();
}

/** Utilisateurs assignables dans un projet (administrateurs + membres). */
export function getAssignableUsers(projectId: string) {
  return membershipService.listAssignableUsers(projectId);
}

// --- Spécifications : paquets de pages de wiki versionnés ---

export function getSpecPackages(projectId: string) {
  return specService.listSpecPackages(projectId);
}

export function getSpecPackageByRootPage(rootPageId: string) {
  return specService.getSpecPackageByRootPage(rootPageId);
}

/** Le paquet auquel appartient une page, qu'elle en soit la racine ou non. */
export function getSpecPackageForPage(projectId: string, pageId: string) {
  return specService.findSpecPackageForPage(projectId, pageId);
}

export function getSpecVersions(packageId: string) {
  return specService.listSpecVersions(packageId);
}

export function getSpecVersion(id: string) {
  return specService.getSpecVersion(id);
}

/** Révisions d'une page de wiki (les plus récentes d'abord, bornées). */
export function getPageRevisions(pageId: string) {
  return wikiService.listPageRevisions(pageId);
}

export function getPageRevision(id: string) {
  return wikiService.getPageRevision(id);
}
