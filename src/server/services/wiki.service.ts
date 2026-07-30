import { prisma } from "@/lib/db";

/** Service Wiki - pages de documentation par projet (autorisation dans les actions). */

/** Pages du projet (métadonnées + parent), pour construire l'arborescence. */
export function listWikiPages(projectId: string) {
  return prisma.wikiPage.findMany({
    where: { projectId },
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      parentId: true,
      updatedAt: true,
      // Marqueur de compte rendu : la section « Réunions » se construit à partir
      // de cette même liste, sans requête supplémentaire.
      meetingDate: true,
    },
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

/**
 * Cree une page ET sa premiere revision, en une transaction.
 *
 * L'historique commence donc a la naissance de la page : sans cette revision
 * initiale, la premiere modification ferait apparaitre un « avant » qui n'existe
 * nulle part, et l'on ne saurait jamais a quoi ressemblait la page d'origine.
 */
export function createWikiPage(input: CreateWikiPageServiceInput) {
  return prisma.$transaction(async (tx) => {
    const page = await tx.wikiPage.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        authorId: input.authorId,
        parentId: input.parentId ?? null,
      },
    });
    await tx.wikiRevision.create({
      data: {
        pageId: page.id,
        title: page.title,
        content: page.content,
        authorId: input.authorId,
      },
    });
    return page;
  });
}

export interface UpdateWikiPageServiceInput {
  id: string;
  title: string;
  content: string;
  parentId?: string | null;
  /** Auteur de la modification, archivé dans la révision. */
  authorId?: string | null;
}

/**
 * Met a jour une page ET archive son nouvel etat en revision, en une transaction.
 *
 * Une revision est ecrite a CHAQUE enregistrement qui change le titre ou le
 * contenu. Un simple deplacement dans l'arborescence n'en cree pas : la page dit
 * toujours la meme chose, et un historique encombre de revisions identiques ne
 * serait plus consultable.
 *
 * C'est aussi la seule trace du DERNIER editeur : `WikiPage.authorId` ne designe
 * que le createur de la page.
 */
export function updateWikiPage(input: UpdateWikiPageServiceInput) {
  return prisma.$transaction(async (tx) => {
    const before = await tx.wikiPage.findUnique({
      where: { id: input.id },
      select: { title: true, content: true },
    });
    if (!before) throw new Error("Page introuvable.");

    const page = await tx.wikiPage.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content,
        // `undefined` = ne pas toucher le parent ; `null` = remonter à la racine.
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      },
    });

    const textChanged =
      before.title !== page.title || before.content !== page.content;
    if (textChanged) {
      await tx.wikiRevision.create({
        data: {
          pageId: page.id,
          title: page.title,
          content: page.content,
          authorId: input.authorId ?? null,
        },
      });
    }
    return page;
  });
}

/**
 * Revisions d'une page, de la plus recente a la plus ancienne. Bornee : un
 * historique se consulte par sa tete, et rien ici ne doit pouvoir ramener des
 * milliers de versions d'un coup.
 */
export const MAX_REVISIONS_LISTED = 50;

export function listPageRevisions(pageId: string) {
  return prisma.wikiRevision.findMany({
    where: { pageId },
    orderBy: { createdAt: "desc" },
    take: MAX_REVISIONS_LISTED,
    select: {
      id: true,
      title: true,
      createdAt: true,
      author: { select: { name: true, email: true } },
    },
  });
}

/** Une revision avec son contenu (lecture d'un etat passe). */
export function getPageRevision(id: string) {
  return prisma.wikiRevision.findUnique({
    where: { id },
    include: {
      author: { select: { name: true, email: true } },
      page: { select: { id: true, projectId: true, title: true } },
    },
  });
}

export function deleteWikiPage(id: string) {
  return prisma.wikiPage.delete({ where: { id } });
}

/**
 * Comptes rendus de réunion du projet, du plus récent au plus ancien. Une page
 * est un compte rendu dès qu'elle porte une date de réunion : il n'y a pas de
 * table dédiée, la structure du compte rendu vivant dans le Markdown.
 */
export function listMeetingPages(projectId: string) {
  return prisma.wikiPage.findMany({
    where: { projectId, meetingDate: { not: null } },
    orderBy: [{ meetingDate: "desc" }, { title: "asc" }],
    select: { id: true, title: true, meetingDate: true, updatedAt: true },
  });
}

/**
 * Déclare (ou retire) une page comme compte rendu de réunion. `null` retire le
 * marqueur SANS toucher au contenu : la page redevient une page ordinaire, rien
 * n'est perdu, et la remarquer plus tard la réaffiche telle quelle.
 */
export function setMeetingDate(pageId: string, meetingDate: string | null) {
  return prisma.wikiPage.update({
    where: { id: pageId },
    data: { meetingDate: meetingDate ? new Date(meetingDate) : null },
    select: { id: true, meetingDate: true },
  });
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
