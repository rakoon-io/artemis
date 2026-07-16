import { prisma } from "@/lib/db";

/** Service Wiki - pages de documentation par projet (autorisation dans les actions). */

/** Pages du projet (métadonnées, pour la barre latérale), plus récentes d'abord. */
export function listWikiPages(projectId: string) {
  return prisma.wikiPage.findMany({
    where: { projectId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, updatedAt: true },
  });
}

/** Une page avec son contenu et son auteur. */
export function getWikiPage(id: string) {
  return prisma.wikiPage.findUnique({
    where: { id },
    include: { author: { select: { name: true, email: true } } },
  });
}

export interface CreateWikiPageServiceInput {
  projectId: string;
  title: string;
  content: string;
  authorId: string;
}

export function createWikiPage(input: CreateWikiPageServiceInput) {
  return prisma.wikiPage.create({ data: input });
}

export interface UpdateWikiPageServiceInput {
  id: string;
  title: string;
  content: string;
}

export function updateWikiPage(input: UpdateWikiPageServiceInput) {
  return prisma.wikiPage.update({
    where: { id: input.id },
    data: { title: input.title, content: input.content },
  });
}

export function deleteWikiPage(id: string) {
  return prisma.wikiPage.delete({ where: { id } });
}

/** Couples (clé, id) des tickets du projet - pour lier les citations « RKN-123 ». */
export function listTicketKeys(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId },
    select: { id: true, key: true },
  });
}
