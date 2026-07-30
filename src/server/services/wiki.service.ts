import { prisma } from "@/lib/db";
import { slugForTitle } from "@/lib/slug";
import { Prisma } from "@prisma/client";

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
      slug: true,
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

/**
 * Slug libre pour un titre dans un projet. Les slugs déjà pris comprennent ceux
 * des pages ET les anciens archivés : réutiliser un ancien slug ferait aboutir un
 * favori sur une page qui n'a rien à voir, ce qui est pire qu'un lien mort.
 *
 * `exceptPageId` écarte la page en cours de renommage, sans quoi elle entrerait
 * en concurrence avec elle-même et gagnerait un « -2 » à chaque enregistrement.
 */
async function freshSlug(
  tx: Prisma.TransactionClient,
  projectId: string,
  title: string,
  exceptPageId?: string,
): Promise<string> {
  const [pages, aliases] = await Promise.all([
    tx.wikiPage.findMany({
      where: {
        projectId,
        slug: { not: null },
        ...(exceptPageId ? { id: { not: exceptPageId } } : {}),
      },
      select: { slug: true },
    }),
    tx.wikiPageSlug.findMany({
      where: {
        projectId,
        ...(exceptPageId ? { pageId: { not: exceptPageId } } : {}),
      },
      select: { slug: true },
    }),
  ]);
  const taken = [
    ...pages.map((page) => page.slug!),
    ...aliases.map((alias) => alias.slug),
  ];
  return slugForTitle(title, taken);
}

/**
 * Retrouve une page à partir de ce qui figure dans l'URL. Trois chemins, du plus
 * courant au plus ancien :
 *   1. le slug courant - le cas normal ;
 *   2. un slug archivé - un favori pris avant un renommage ;
 *   3. l'identifiant technique - les liens d'avant la fonctionnalité, et les
 *      pages qui n'ont pas encore de slug.
 *
 * Renvoie aussi `canonicalSlug`, pour que l'appelant puisse rediriger vers
 * l'adresse à jour plutôt que de laisser vivre indéfiniment une ancienne.
 */
export async function resolveWikiPage(projectId: string, handle: string) {
  const bySlug = await prisma.wikiPage.findFirst({
    where: { projectId, slug: handle },
    include: { author: { select: { name: true, email: true } } },
  });
  if (bySlug) return { page: bySlug, canonicalSlug: bySlug.slug, moved: false };

  const alias = await prisma.wikiPageSlug.findFirst({
    where: { projectId, slug: handle },
    select: { pageId: true },
  });
  const id = alias?.pageId ?? handle;
  const page = await prisma.wikiPage.findFirst({
    where: { id, projectId },
    include: { author: { select: { name: true, email: true } } },
  });
  if (!page) return null;
  return { page, canonicalSlug: page.slug, moved: true };
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
        slug: await freshSlug(tx, input.projectId, input.title),
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
      select: { title: true, content: true, slug: true, projectId: true },
    });
    if (!before) throw new Error("Page introuvable.");

    // L'adresse suit le titre : renommer la page renomme son slug. L'ancien est
    // archivé juste avant, pour que les favoris et les liens déjà partagés
    // continuent d'aboutir (cf. `model WikiPageSlug`).
    const renamed = before.title !== input.title || !before.slug;
    const nextSlug = renamed
      ? await freshSlug(tx, before.projectId, input.title, input.id)
      : before.slug;

    if (renamed && before.slug && before.slug !== nextSlug) {
      await tx.wikiPageSlug.upsert({
        where: {
          projectId_slug: { projectId: before.projectId, slug: before.slug },
        },
        create: {
          projectId: before.projectId,
          pageId: input.id,
          slug: before.slug,
        },
        // Un slug repris par une AUTRE page revient à celle qui le porte
        // désormais : c'est elle que l'ancien lien doit atteindre.
        update: { pageId: input.id },
      });
    }

    const page = await tx.wikiPage.update({
      where: { id: input.id },
      data: {
        title: input.title,
        content: input.content,
        slug: nextSlug,
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
    // Titre et assigné en plus de la clef : c'est ce qui alimente l'infobulle
    // d'une citation « RKN-123 ». Le surcoût est nul - même requête, deux
    // colonnes de plus - et il évite une requête par lien affiché.
    select: {
      id: true,
      key: true,
      title: true,
      assignee: { select: { name: true, email: true } },
    },
  });
}

/** Références (id, clé, titre) des tickets du projet - pour l'autocomplétion « @ ». */
export function listTicketRefs(projectId: string) {
  return prisma.ticket.findMany({
    where: { projectId },
    orderBy: { number: "desc" },
    // Même enrichissement que `listTicketKeys` : la description d'un ticket cite
    // d'autres tickets, et doit pouvoir les survoler comme le fait le wiki.
    select: {
      id: true,
      key: true,
      title: true,
      assignee: { select: { name: true, email: true } },
    },
  });
}
