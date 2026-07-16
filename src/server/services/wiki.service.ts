import { prisma } from "@/lib/db";

/** Service Wiki - pages de documentation par projet (autorisation dans les actions). */

/** Pages du projet (métadonnées + parent), pour construire l'arborescence. */
export function listWikiPages(projectId: string) {
  return prisma.wikiPage.findMany({
    where: { projectId },
    orderBy: { title: "asc" },
    select: { id: true, title: true, parentId: true, updatedAt: true },
  });
}

/** Extrait de contenu autour de la première occurrence de la requête. */
function makeSnippet(content: string, query: string, radius = 80): string {
  const flat = content.replace(/\s+/g, " ").trim();
  if (!flat) return "";
  const idx = flat.toLowerCase().indexOf(query.toLowerCase());
  if (idx < 0) {
    return flat.length > radius * 2 ? `${flat.slice(0, radius * 2)}...` : flat;
  }
  const start = Math.max(0, idx - radius);
  const end = Math.min(flat.length, idx + query.length + radius);
  return `${start > 0 ? "..." : ""}${flat.slice(start, end)}${end < flat.length ? "..." : ""}`;
}

/** Recherche plein texte (titre + contenu) dans les pages du projet, avec extrait. */
export async function searchWikiPages(projectId: string, query: string) {
  const pages = await prisma.wikiPage.findMany({
    where: {
      projectId,
      OR: [
        { title: { contains: query, mode: "insensitive" } },
        { content: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, content: true, updatedAt: true },
  });
  return pages.map((p) => ({
    id: p.id,
    title: p.title,
    updatedAt: p.updatedAt,
    snippet: makeSnippet(p.content, query),
  }));
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
  parentId?: string | null;
}

export function createWikiPage(input: CreateWikiPageServiceInput) {
  return prisma.wikiPage.create({
    data: {
      projectId: input.projectId,
      title: input.title,
      content: input.content,
      authorId: input.authorId,
      parentId: input.parentId ?? null,
    },
  });
}

export interface UpdateWikiPageServiceInput {
  id: string;
  title: string;
  content: string;
  parentId?: string | null;
}

export function updateWikiPage(input: UpdateWikiPageServiceInput) {
  return prisma.wikiPage.update({
    where: { id: input.id },
    data: {
      title: input.title,
      content: input.content,
      // `undefined` = ne pas toucher le parent ; `null` = remonter à la racine.
      ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
    },
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

/** Références (id, clé, titre) des tickets du projet - pour l'autocomplétion « @ ». */
export function listTicketRefs(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId },
    orderBy: { number: "desc" },
    select: { id: true, key: true, title: true },
  });
}
