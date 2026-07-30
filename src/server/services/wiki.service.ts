import { prisma } from "@/lib/db";
import { slugForTitle } from "@/lib/slug";
import {
  buildSearchText,
  buildSnippet,
  searchTerms,
  toPrefixQuery,
} from "@/lib/search-text";
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

/** Nombre de résultats par page. La liste latérale n'en montre pas davantage. */
export const SEARCH_PAGE_SIZE = 10;

export interface WikiSearchHit {
  id: string;
  title: string;
  slug: string | null;
  updatedAt: Date;
  /** Extrait centré sur le premier terme trouvé, dans le texte d'origine. */
  snippet: string;
  truncatedStart: boolean;
  truncatedEnd: boolean;
}

export interface WikiSearchResult {
  hits: WikiSearchHit[];
  /** Total des pages correspondantes, toutes pages de résultats confondues. */
  total: number;
  page: number;
  pageSize: number;
  /** Termes retenus : le surlignage de l'extrait s'appuie dessus. */
  terms: string[];
}

/**
 * Recherche plein texte dans les pages d'un projet.
 *
 * Trois choses la distinguent de la recherche par sous-chaîne qu'elle remplace :
 *
 *  - les ACCENTS ne comptent plus. Texte indexé et requête passent par le même
 *    repli (`@/lib/search-text`), si bien que « imperatif » trouve « impératif ».
 *  - l'ORDRE DES MOTS ne compte plus. Les termes sont liés par ET dans la
 *    `tsquery` ; « csv export » et « export csv » donnent le même résultat. Le
 *    préfixe (`:*`) fait en outre que « recrut » trouve « recrutement ».
 *  - les résultats sont CLASSÉS par pertinence (`ts_rank`) et non par date. Le
 *    titre est répété dans le texte indexé, ce qui suffit à faire remonter une
 *    page dont le titre porte le mot cherché.
 *
 * La requête est brute parce que Prisma ne sait exprimer ni `ts_rank` ni un
 * `count` fenêtré. Les valeurs restent des PARAMÈTRES : `to_tsquery` ne reçoit
 * que des lettres et des chiffres, garantis par `searchTerms`.
 *
 * Le total est ramené par `count(*) OVER ()` dans la même requête, plutôt qu'un
 * second aller-retour dont le résultat pourrait déjà être périmé.
 */
export async function searchWikiPages(
  projectId: string,
  query: string,
  page = 1,
): Promise<WikiSearchResult> {
  const terms = searchTerms(query);
  const pageSize = SEARCH_PAGE_SIZE;
  const current = Math.max(1, Math.floor(page));
  if (terms.length === 0) {
    return { hits: [], total: 0, page: current, pageSize, terms };
  }

  const rows = await prisma.$queryRaw<
    Array<{
      id: string;
      title: string;
      slug: string | null;
      content: string;
      updatedAt: Date;
      total: bigint;
    }>
  >`
    SELECT p.id,
           p.title,
           p.slug,
           p.content,
           p."updatedAt",
           count(*) OVER () AS total
    FROM "WikiPage" p,
         to_tsquery('french', ${toPrefixQuery(terms)}) AS q
    WHERE p."projectId" = ${projectId}
      AND to_tsvector('french', COALESCE(p."searchText", '')) @@ q
    ORDER BY ts_rank(to_tsvector('french', COALESCE(p."searchText", '')), q) DESC,
             p."updatedAt" DESC
    LIMIT ${pageSize} OFFSET ${(current - 1) * pageSize}
  `;

  return {
    // L'extrait est calculé ici, sur les seules lignes rendues : `ts_headline`
    // aurait produit du HTML à réinjecter, donc une porte ouverte à l'injection
    // depuis le contenu d'une page.
    hits: rows.map((row) => {
      const snippet = buildSnippet(row.content, terms);
      return {
        id: row.id,
        title: row.title,
        slug: row.slug,
        updatedAt: row.updatedAt,
        snippet: snippet.text,
        truncatedStart: snippet.truncatedStart,
        truncatedEnd: snippet.truncatedEnd,
      };
    }),
    total: Number(rows[0]?.total ?? 0),
    page: current,
    pageSize,
    terms,
  };
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
        searchText: buildSearchText(input.title, input.content),
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
        // Recalculé à chaque enregistrement : une page dont on corrige le texte
        // doit redevenir trouvable par les mots qu'elle contient désormais.
        searchText: buildSearchText(input.title, input.content),
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
