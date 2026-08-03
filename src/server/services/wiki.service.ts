import { prisma } from "@/lib/db";
import { forgetObjects, wikiSubtreeKeys } from "./stored-objects.service";
import { datePrefix, slugForTitle } from "@/lib/slug";
import {
  buildSearchText,
  buildSnippet,
  searchTerms,
  toPrefixQuery,
} from "@/lib/search-text";
import { Prisma } from "@prisma/client";
// Import de TYPE : dereferencer l'objet enum au chargement du module le rendrait
// tributaire de l'ordre d'initialisation du client genere (cf. project.service).
import type { WikiSectionKind } from "@prisma/client";

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

/**
 * Contenu de pages désignées, pour composer un document imprimable.
 *
 * EN DEUX TEMPS, et non en une requête qui ramènerait tout : `listWikiPages`
 * donne l'arborescence sans le texte, on en tire le sous-arbre voulu, puis on ne
 * lit QUE le contenu de ces pages-là. Imprimer une page d'un wiki qui en compte
 * trois cents ne doit pas en charger trois cents.
 *
 * `projectId` borne la requête bien que les identifiants viennent déjà de
 * l'arbre du projet : la garde ne coûte rien et interdit qu'un appelant futur,
 * moins prudent, fasse traverser la frontière à une liste d'identifiants.
 */
export function getWikiPagesContent(projectId: string, ids: string[]) {
  if (ids.length === 0) return Promise.resolve([]);
  return prisma.wikiPage.findMany({
    where: { projectId, id: { in: ids } },
    select: { id: true, content: true },
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
  prefix?: string | null,
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
  return slugForTitle(title, taken, prefix);
}

/**
 * Range l'ancien slug d'une page parmi les archives, pour que les favoris et les
 * liens déjà partagés continuent d'aboutir après un renommage.
 */
async function archiveSlug(
  tx: Prisma.TransactionClient,
  projectId: string,
  pageId: string,
  slug: string,
): Promise<void> {
  await tx.wikiPageSlug.upsert({
    where: { projectId_slug: { projectId, slug } },
    create: { projectId, pageId, slug },
    // Un slug repris par une AUTRE page revient à celle qui le porte désormais :
    // c'est elle que l'ancien lien doit atteindre.
    update: { pageId },
  });
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
  /**
   * Date de réunion, au format `AAAA-MM-JJ`. La renseigner fait naître la page
   * COMPTE RENDU : marqueur posé et adresse déjà datée.
   *
   * C'est la seule façon d'obtenir le bon slug du premier coup. Créer la page
   * puis la dater dans un second temps donnerait une adresse sans date,
   * aussitôt remplacée et archivée - un alias mort-né pour une page que
   * personne n'a eu le temps de lire.
   */
  meetingDate?: string | null;
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
    const prefix = datePrefix(input.meetingDate);
    const page = await tx.wikiPage.create({
      data: {
        projectId: input.projectId,
        title: input.title,
        content: input.content,
        authorId: input.authorId,
        parentId: input.parentId ?? null,
        meetingDate: input.meetingDate ? new Date(input.meetingDate) : null,
        slug: await freshSlug(tx, input.projectId, input.title, undefined, prefix),
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
      select: {
        title: true,
        content: true,
        slug: true,
        projectId: true,
        meetingDate: true,
      },
    });
    if (!before) throw new Error("Page introuvable.");

    // L'adresse suit le titre : renommer la page renomme son slug. L'ancien est
    // archivé juste avant, pour que les favoris et les liens déjà partagés
    // continuent d'aboutir (cf. `model WikiPageSlug`).
    //
    // Un compte rendu est en outre PRÉFIXÉ PAR SA DATE : l'adresse dit alors de
    // quelle réunion il s'agit, et les comptes rendus se rangent d'eux-mêmes
    // dans l'ordre chronologique.
    const renamed = before.title !== input.title || !before.slug;
    const nextSlug = renamed
      ? await freshSlug(
          tx,
          before.projectId,
          input.title,
          input.id,
          datePrefix(before.meetingDate),
        )
      : before.slug;

    if (renamed && before.slug && before.slug !== nextSlug) {
      await archiveSlug(tx, before.projectId, input.id, before.slug);
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

/**
 * Supprime une page - SAUF si elle est la racine d'une section prédéfinie.
 *
 * Les clefs étrangères sont en CASCADE, vérifié en base : `WikiPage.parentId`,
 * `WikiRevision.pageId`, `SpecPackage.rootPageId`. Effacer « Réunions »
 * effacerait donc tous les comptes rendus du projet, leur historique et les
 * paquets qui y sont ancrés, en une requête et sans retour possible. Une page
 * ordinaire supprimée par erreur, c'est un incident ; une section, c'est la
 * mémoire du projet.
 *
 * Le garde-fou vit ICI et non dans l'action : c'est le seul chemin vers
 * `delete`, donc le seul endroit où l'interdit vaille aussi pour l'appelant qui
 * n'existe pas encore.
 */
export async function deleteWikiPage(id: string) {
  const section = await prisma.wikiSection.findUnique({
    where: { rootPageId: id },
    select: { kind: true },
  });
  if (section) {
    throw new Error(
      "Cette page est une section du wiki : elle ne peut pas être supprimée. Videz-la ou déplacez son contenu.",
    );
  }
  /**
   * Le sous-arbre ENTIER, et relevé avant la suppression.
   *
   * `WikiPage.parentId` est en cascade : effacer cette page efface ses enfants
   * et leurs descendants. Ne regarder que les pièces jointes de la page nommée
   * laisserait donc en place tous les fichiers des pages emportées avec elle -
   * et, la base ne les mentionnant plus, sans aucun moyen de les retrouver.
   */
  const cles = await wikiSubtreeKeys(id);
  const supprimee = await prisma.wikiPage.delete({ where: { id } });
  await forgetObjects(cles);
  return supprimee;
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
  return prisma.$transaction(async (tx) => {
    const before = await tx.wikiPage.findUnique({
      where: { id: pageId },
      select: { projectId: true, title: true, slug: true },
    });
    if (!before) throw new Error("Page introuvable.");

    // Dater une page - ou lui retirer sa date - change son adresse, puisque le
    // slug d'un compte rendu porte la date en tête. L'ancienne est archivée :
    // un lien partagé avant le marquage continue d'aboutir.
    const nextSlug = await freshSlug(
      tx,
      before.projectId,
      before.title,
      pageId,
      meetingDate,
    );
    if (before.slug && before.slug !== nextSlug) {
      await archiveSlug(tx, before.projectId, pageId, before.slug);
    }

    return tx.wikiPage.update({
      where: { id: pageId },
      data: {
        meetingDate: meetingDate ? new Date(meetingDate) : null,
        slug: nextSlug,
      },
      select: { id: true, meetingDate: true, slug: true },
    });
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

/* ─────────────────────────────────────────────────────────────────────────────
 * SECTIONS PRÉDÉFINIES
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Les trois sections d'un wiki, dans l'ordre où elles se lisent. Les intitulés
 * sont en français comme le reste des valeurs par défaut d'un projet
 * (`DEFAULT_COLUMNS`, `DEFAULT_TICKET_TYPES`) : ce sont des PAGES, que l'on
 * renomme ensuite librement sans que l'application y perde son latin - elle les
 * reconnaît par leur identifiant, jamais par leur titre.
 */
export const DEFAULT_WIKI_SECTIONS: ReadonlyArray<{
  kind: WikiSectionKind;
  title: string;
  content: string;
}> = [
  {
    kind: "SPEC",
    title: "Spécifications",
    content:
      "Ce que le produit doit faire, tel qu'on s'y engage. Chaque spécification se publie en versions figées, citables depuis un ticket : une version publiée ne change plus.",
  },
  {
    kind: "MEETING",
    title: "Réunions",
    content:
      "Les comptes rendus, un par réunion, classés par date. Un compte rendu ne se réécrit pas : ce qui a été dit ce jour-là le reste.",
  },
  {
    kind: "IMPLEMENTATION",
    title: "Implémentation",
    content:
      "Comment le produit est fait : architecture, décisions techniques, procédures. Contrairement aux deux autres, cette documentation n'a qu'un seul état valable - le plus récent.",
  },
];

export function listWikiSections(projectId: string) {
  return prisma.wikiSection.findMany({
    where: { projectId },
    select: { kind: true, rootPageId: true },
  });
}

/**
 * Crée les sections MANQUANTES d'un projet, et range sous elles ce qui est
 * identifiable SANS DEVINER.
 *
 * Deux règles, et seulement deux :
 *  - une page qui porte une date EST un compte rendu ;
 *  - une page qui est racine d'un paquet EST une spécification.
 * Aucun classement n'est tenté pour le reste : « ça ressemble à de la doc
 * technique » n'est pas un critère, et une page mal rangée d'office coûte plus
 * cher à retrouver qu'une page restée à sa place.
 *
 * Et parmi celles-là, seules sont déplacées les pages POSÉES À LA RACINE.
 * Une page déjà rangée sous une autre l'a été par quelqu'un ; la déplacer
 * reviendrait à défaire une décision humaine au nom d'une règle automatique.
 */
export function ensureWikiSections(projectId: string, authorId?: string | null) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.wikiSection.findMany({
      where: { projectId },
      select: { kind: true, rootPageId: true },
    });
    const known = new Map(existing.map((s) => [s.kind, s.rootPageId]));

    for (const section of DEFAULT_WIKI_SECTIONS) {
      if (known.has(section.kind)) continue;
      const page = await tx.wikiPage.create({
        data: {
          projectId,
          title: section.title,
          content: section.content,
          authorId: authorId ?? null,
          slug: await freshSlug(tx, projectId, section.title),
          searchText: buildSearchText(section.title, section.content),
        },
      });
      await tx.wikiRevision.create({
        data: {
          pageId: page.id,
          title: page.title,
          content: page.content,
          authorId: authorId ?? null,
        },
      });
      await tx.wikiSection.create({
        data: { projectId, kind: section.kind, rootPageId: page.id },
      });
      known.set(section.kind, page.id);
    }

    const meetingRoot = known.get("MEETING");
    const specRoot = known.get("SPEC");
    let filed = 0;

    if (meetingRoot) {
      const { count } = await tx.wikiPage.updateMany({
        where: {
          projectId,
          parentId: null,
          meetingDate: { not: null },
          id: { not: meetingRoot },
        },
        data: { parentId: meetingRoot },
      });
      filed += count;
    }

    if (specRoot) {
      const packages = await tx.specPackage.findMany({
        where: { projectId },
        select: { rootPageId: true },
      });
      if (packages.length > 0) {
        const { count } = await tx.wikiPage.updateMany({
          where: {
            projectId,
            parentId: null,
            id: { in: packages.map((p) => p.rootPageId), not: specRoot },
          },
          data: { parentId: specRoot },
        });
        filed += count;
      }
    }

    return { sections: [...known.entries()].map(([kind, rootPageId]) => ({ kind, rootPageId })), filed };
  });
}

/* ─────────────────────────────────────────────────────────────────────────────
 * CE QU'UNE PAGE DOCUMENTE, ET DEPUIS QUAND ON L'A VUE
 * ────────────────────────────────────────────────────────────────────────── */

/**
 * Déclare les SUJETS d'une page : les modules et composants qu'elle documente.
 *
 * Remplacement intégral plutôt que patch : l'appelant envoie l'état voulu, le
 * service l'établit. Un « ajouter / retirer » exigerait de connaître l'état
 * courant au moment du clic, et deux personnes éditant la même page se
 * défairaient mutuellement sans s'en apercevoir.
 *
 * Les identifiants sont FILTRÉS sur le projet de la page : un module d'un autre
 * projet, glissé dans la requête, ne crée pas de lien - il disparaît, sans
 * erreur ni lien fantôme.
 */
export function setWikiPageSubjects(
  pageId: string,
  moduleIds: string[],
  componentIds: string[],
) {
  return prisma.$transaction(async (tx) => {
    const page = await tx.wikiPage.findUnique({
      where: { id: pageId },
      select: { projectId: true },
    });
    if (!page) throw new Error("Page introuvable.");

    const [modules, components] = await Promise.all([
      moduleIds.length
        ? tx.module.findMany({
            where: { id: { in: moduleIds }, projectId: page.projectId },
            select: { id: true },
          })
        : Promise.resolve([]),
      componentIds.length
        ? tx.component.findMany({
            where: { id: { in: componentIds }, projectId: page.projectId },
            select: { id: true },
          })
        : Promise.resolve([]),
    ]);

    await tx.wikiPageModule.deleteMany({ where: { pageId } });
    await tx.wikiPageComponent.deleteMany({ where: { pageId } });
    if (modules.length) {
      await tx.wikiPageModule.createMany({
        data: modules.map((m) => ({ pageId, moduleId: m.id })),
      });
    }
    if (components.length) {
      await tx.wikiPageComponent.createMany({
        data: components.map((c) => ({ pageId, componentId: c.id })),
      });
    }
    return { modules: modules.length, components: components.length };
  });
}

/** Sujets déclarés par une page, avec de quoi les afficher. */
export function getWikiPageSubjects(pageId: string) {
  return prisma.$transaction([
    prisma.wikiPageModule.findMany({
      where: { pageId },
      select: { module: { select: { id: true, name: true, color: true } } },
      orderBy: { module: { name: "asc" } },
    }),
    prisma.wikiPageComponent.findMany({
      where: { pageId },
      select: {
        component: { select: { id: true, name: true, color: true, kind: true } },
      },
      orderBy: { component: { name: "asc" } },
    }),
  ]);
}

/**
 * Pages documentant un module ou un composant donné.
 *
 * C'est le sens de lecture INVERSE, celui qui fait du wiki un index du système :
 * on part de la brique sur laquelle on travaille, et l'on trouve ce qui en est
 * écrit. Sans lui, les liens ne serviraient qu'à décorer les pages.
 */
export function listPagesDocumenting(subjects: {
  moduleIds?: string[];
  componentIds?: string[];
}) {
  const moduleIds = subjects.moduleIds?.filter(Boolean) ?? [];
  const componentIds = subjects.componentIds?.filter(Boolean) ?? [];
  if (moduleIds.length === 0 && componentIds.length === 0) {
    return Promise.resolve([]);
  }
  return prisma.wikiPage.findMany({
    where: {
      OR: [
        ...(moduleIds.length
          ? [{ modules: { some: { moduleId: { in: moduleIds } } } }]
          : []),
        ...(componentIds.length
          ? [{ components: { some: { componentId: { in: componentIds } } } }]
          : []),
      ],
    },
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      reviewedAt: true,
      projectId: true,
    },
    orderBy: { title: "asc" },
  });
}

/**
 * Déclare une page RELUE aujourd'hui : « je l'ai lue, c'est toujours vrai ».
 *
 * N'écrit pas de révision et ne touche pas au contenu - donc pas à `updatedAt`
 * non plus. Une relecture n'est pas une modification : la faire apparaître dans
 * l'historique noierait les vrais changements sous des lignes qui ne disent
 * rien de ce que la page raconte.
 */
export function markWikiPageReviewed(pageId: string) {
  return prisma.wikiPage.update({
    where: { id: pageId },
    data: { reviewedAt: new Date() },
    select: { id: true, reviewedAt: true },
  });
}

/**
 * INDEX DE LA DOCUMENTATION d'un projet : quelles pages décrivent quelle brique.
 *
 * Deux requêtes pour tout le catalogue, et non une par module puis une par
 * composant. La page Structure affiche des dizaines de briques : la lire ligne
 * à ligne coûterait autant d'allers-retours que le projet compte d'entrées, pour
 * un résultat identique.
 */
export async function listDocumentationIndex(projectId: string) {
  const page = {
    select: {
      id: true,
      title: true,
      slug: true,
      updatedAt: true,
      reviewedAt: true,
    },
  } as const;
  const [modules, components] = await Promise.all([
    prisma.wikiPageModule.findMany({
      where: { page: { projectId } },
      select: { moduleId: true, page },
      orderBy: { page: { title: "asc" } },
    }),
    prisma.wikiPageComponent.findMany({
      where: { page: { projectId } },
      select: { componentId: true, page },
      orderBy: { page: { title: "asc" } },
    }),
  ]);
  return { modules, components };
}
