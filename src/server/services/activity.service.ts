import { prisma } from "@/lib/db";
import { excerptAround, mentionNeedle } from "@/lib/mentions-search";

/**
 * Service « Mon activité » - accès données pur.
 *
 * TROIS LECTURES, TROIS QUESTIONS : où j'en suis (mes tâches), qui s'adresse à
 * moi (mes citations), ce qui a bougé (le fil du projet).
 *
 * Le périmètre est TOUJOURS reçu en argument (`projectIds`), jamais décidé ici :
 * `undefined` = tous les projets (administrateur), `[]` = aucun. C'est la même
 * convention que `listProjectsWithStats`, et c'est l'appelant - qui, lui,
 * connaît l'utilisateur - qui la calcule.
 *
 * L'argument est OBLIGATOIRE, quoique nullable : `undefined` doit s'écrire pour
 * exister. Facultatif, l'oublier aurait ouvert la lecture à toute l'instance
 * sans un mot du compilateur - un défaut par ouverture, dans une garde d'accès.
 */

/** Position d'un ticket dans le flux, déduite de l'ordre de sa colonne. */
export type Stage = "todo" | "doing" | "done";

export interface MyTicketRow {
  id: string;
  key: string;
  title: string;
  projectKey: string;
  columnName: string;
  stage: Stage;
}

export interface MentionRow {
  id: string;
  source: "page" | "comment" | "ticket";
  at: Date;
  href: string;
  /** Ce qui est cité : titre de la page, ou clé du ticket. */
  target: string;
  projectKey: string;
  /** Qui a écrit la citation ; `null` si le compte n'existe plus. */
  author: string | null;
  excerpt: string;
}

export interface ActivityRow {
  id: string;
  kind: "ticket" | "comment" | "page" | "pageCreated" | "attachment" | "link";
  at: Date;
  href: string;
  target: string;
  projectKey: string;
  actor: string | null;
  /** Complément affiché en gris (titre du ticket, nom du fichier...). */
  detail: string | null;
}

/** Restriction de périmètre réutilisée par toutes les lectures. */
function scope(projectIds: string[] | undefined) {
  return projectIds ? { in: projectIds } : undefined;
}

/** Nom lisible d'une personne, l'adresse servant de repli. */
function personLabel(
  user: { name: string | null; email: string } | null | undefined,
): string | null {
  if (!user) return null;
  return user.name ?? user.email;
}

/** Nombre de tâches par étape, comptées en base et NON déduites de la liste. */
export interface StageCounts {
  todo: number;
  doing: number;
  done: number;
  total: number;
}

/** Ce que rend `listMyTickets` : des totaux exacts, et une liste bornée. */
export interface MyTickets {
  rows: MyTicketRow[];
  counts: StageCounts;
}

/**
 * Au-delà, la liste cesse d'être un rappel pour devenir un second gestionnaire
 * de tickets - la vue Liste existe pour cela, et elle sait filtrer.
 */
const MY_TICKETS_LISTED = 50;

/**
 * Tâches assignées à l'utilisateur, les plus récemment remuées d'abord.
 *
 * L'ÉTAPE se déduit de l'ordre des colonnes, seule notion de progression que
 * porte le modèle : la dernière colonne vaut « terminé » (même convention que
 * les cartes de projet, garde comprise), la première « à faire », le reste
 * « en cours ». Un projet à colonne unique n'a pas de flux : rien n'y est
 * « terminé », tout y est « à faire ».
 *
 * LES TOTAUX SONT COMPTÉS À PART, et c'est délibéré : les déduire d'une liste
 * bornée ferait mentir la barre d'avancement dès la cinquante-et-unième tâche.
 */
export async function listMyTickets(
  userId: string,
  projectIds: string[] | undefined,
): Promise<MyTickets> {
  const projectId = scope(projectIds);
  const assigned = { assigneeId: userId, ...(projectId ? { projectId } : {}) };
  const [tickets, columns, grouped] = await Promise.all([
    prisma.ticket.findMany({
      where: assigned,
      orderBy: { updatedAt: "desc" },
      take: MY_TICKETS_LISTED,
      select: {
        id: true,
        key: true,
        title: true,
        column: { select: { id: true, name: true, order: true } },
        project: { select: { key: true } },
        projectId: true,
      },
    }),
    prisma.column.findMany({
      where: projectId ? { projectId } : {},
      select: { projectId: true, order: true },
    }),
    prisma.ticket.groupBy({
      by: ["columnId", "projectId"],
      where: assigned,
      _count: { _all: true },
    }),
  ]);

  // Bornes du flux, par projet : sans elles, « terminé » n'a pas de sens.
  const bounds = new Map<string, { min: number; max: number }>();
  for (const c of columns) {
    const b = bounds.get(c.projectId);
    if (!b) bounds.set(c.projectId, { min: c.order, max: c.order });
    else {
      if (c.order < b.min) b.min = c.order;
      if (c.order > b.max) b.max = c.order;
    }
  }

  /** L'étape d'une colonne, au sein de son projet. */
  const stageOf = (projectId: string, order: number): Stage => {
    const b = bounds.get(projectId);
    if (!b) return "doing";
    if (b.max > b.min && order === b.max) return "done";
    if (order === b.min) return "todo";
    return "doing";
  };

  // Ordre de chaque colonne, pour rattacher les totaux groupés à une étape.
  const orderByColumn = new Map<string, number>();
  for (const t of tickets) orderByColumn.set(t.column.id, t.column.order);
  const columnOrders = await (orderByColumn.size >= grouped.length
    ? Promise.resolve(null)
    : prisma.column.findMany({
        where: { id: { in: grouped.map((g) => g.columnId) } },
        select: { id: true, order: true },
      }));
  for (const c of columnOrders ?? []) orderByColumn.set(c.id, c.order);

  const counts: StageCounts = { todo: 0, doing: 0, done: 0, total: 0 };
  for (const g of grouped) {
    const order = orderByColumn.get(g.columnId);
    const n = g._count._all;
    counts.total += n;
    if (order === undefined) continue;
    counts[stageOf(g.projectId, order)] += n;
  }

  return {
    counts,
    rows: tickets.map((t) => ({
      id: t.id,
      key: t.key,
      title: t.title,
      projectKey: t.project.key,
      columnName: t.column.name,
      stage: stageOf(t.projectId, t.column.order),
    })),
  };
}

/**
 * Citations visant l'utilisateur, les plus récentes d'abord.
 *
 * Une mention est du Markdown, pas une relation (cf. `mentions-search`) : on la
 * cherche donc dans les TEXTES - pages, commentaires, descriptions. Ses propres
 * citations sont écartées : s'entendre dire qu'on s'est cité soi-même n'apprend
 * rien.
 */
export async function listMyMentions(
  userId: string,
  email: string,
  projectIds: string[] | undefined,
  limit = 20,
): Promise<MentionRow[]> {
  if (!email) return [];
  const needle = mentionNeedle(email);
  const projectId = scope(projectIds);
  // Chaque source est sur-lue puis fusionnée : la plus récente peut venir de
  // n'importe laquelle, on ne peut donc pas répartir la limite à l'avance.
  const each = limit;

  const [pages, comments, tickets] = await Promise.all([
    prisma.wikiPage.findMany({
      where: {
        content: { contains: needle },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: each,
      select: {
        id: true,
        slug: true,
        title: true,
        content: true,
        updatedAt: true,
        project: { select: { key: true } },
      },
    }),
    prisma.comment.findMany({
      where: {
        body: { contains: needle },
        authorId: { not: userId },
        ...(projectId ? { ticket: { projectId } } : {}),
      },
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        body: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
        ticket: {
          select: { id: true, key: true, project: { select: { key: true } } },
        },
      },
    }),
    prisma.ticket.findMany({
      where: {
        description: { contains: needle },
        reporterId: { not: userId },
        ...(projectId ? { projectId } : {}),
      },
      orderBy: { updatedAt: "desc" },
      take: each,
      select: {
        id: true,
        key: true,
        description: true,
        updatedAt: true,
        reporter: { select: { name: true, email: true } },
        project: { select: { key: true } },
      },
    }),
  ]);

  /**
   * QUI a cité, et QUAND : la plus ancienne révision dont le texte porte déjà la
   * citation. Prendre la DERNIÈRE révision d'une page reviendrait à désigner qui
   * l'a touchée en dernier - corriger une faute de frappe ferait dire à
   * l'interface « Marie vous a cité », ce que Marie n'a jamais fait. Une page
   * sans révision correspondante ne se voit attribuer personne : mieux vaut
   * « quelqu'un » qu'un nom faux.
   */
  const citing = new Map<string, { at: Date; author: { id: string; name: string | null; email: string } | null }>();
  if (pages.length > 0) {
    const revisions = await prisma.wikiRevision.findMany({
      where: {
        pageId: { in: pages.map((p) => p.id) },
        content: { contains: needle },
      },
      orderBy: [{ pageId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      distinct: ["pageId"],
      select: {
        pageId: true,
        createdAt: true,
        author: { select: { id: true, name: true, email: true } },
      },
    });
    for (const r of revisions) {
      citing.set(r.pageId, { at: r.createdAt, author: r.author });
    }
  }

  const rows: MentionRow[] = [
    ...pages
      .filter((p) => citing.get(p.id)?.author?.id !== userId)
      .map((p) => {
        const origin = citing.get(p.id);
        return {
          id: `page:${p.id}`,
          source: "page" as const,
          // Date de la CITATION, pas de la dernière retouche de la page.
          at: origin?.at ?? p.updatedAt,
          // Même adresse que partout ailleurs : le slug quand il existe, sinon
          // l'identifiant (les pages antérieures n'en ont pas).
          href: `/projects/${p.project.key}/wiki?page=${p.slug ?? p.id}`,
          target: p.title,
          projectKey: p.project.key,
          author: personLabel(origin?.author),
          excerpt: excerptAround(p.content, needle),
        };
      }),
    ...comments.map((c) => ({
      id: `comment:${c.id}`,
      source: "comment" as const,
      at: c.createdAt,
      href: `/projects/${c.ticket.project.key}/tickets/${c.ticket.id}`,
      target: c.ticket.key,
      projectKey: c.ticket.project.key,
      author: personLabel(c.author),
      excerpt: excerptAround(c.body, needle),
    })),
    ...tickets.map((t) => ({
      id: `ticket:${t.id}`,
      source: "ticket" as const,
      at: t.updatedAt,
      href: `/projects/${t.project.key}/tickets/${t.id}`,
      target: t.key,
      projectKey: t.project.key,
      author: personLabel(t.reporter),
      excerpt: excerptAround(t.description ?? "", needle),
    })),
  ];

  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}

/**
 * Ce qui a bougé dans les projets accessibles, le plus récent d'abord.
 *
 * N'y figure QUE ce qui est daté ET signé : on ne prétend pas dire « qui a fait
 * quoi » là où le modèle ne retient que l'état courant. Un déplacement dans le
 * tableau, une réaffectation, un changement de priorité n'y sont donc pas -
 * `Ticket.updatedAt` sait qu'il s'est passé quelque chose, jamais quoi ni par
 * qui. Mieux vaut un fil incomplet qu'un fil qui invente.
 */
export async function listRecentActivity(
  projectIds: string[] | undefined,
  limit = 20,
): Promise<ActivityRow[]> {
  const projectId = scope(projectIds);
  const each = limit;

  const [tickets, comments, revisions, attachments, links] = await Promise.all([
    prisma.ticket.findMany({
      where: projectId ? { projectId } : {},
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        key: true,
        title: true,
        createdAt: true,
        reporter: { select: { name: true, email: true } },
        project: { select: { key: true } },
      },
    }),
    prisma.comment.findMany({
      where: projectId ? { ticket: { projectId } } : {},
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        createdAt: true,
        author: { select: { name: true, email: true } },
        ticket: {
          select: {
            id: true,
            key: true,
            title: true,
            project: { select: { key: true } },
          },
        },
      },
    }),
    prisma.wikiRevision.findMany({
      where: projectId ? { page: { projectId } } : {},
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        createdAt: true,
        title: true,
        author: { select: { name: true, email: true } },
        page: {
          select: { id: true, slug: true, project: { select: { key: true } } },
        },
      },
    }),
    prisma.attachment.findMany({
      where: projectId ? { ticket: { projectId } } : {},
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        filename: true,
        createdAt: true,
        uploadedBy: { select: { name: true, email: true } },
        ticket: {
          select: { id: true, key: true, project: { select: { key: true } } },
        },
      },
    }),
    prisma.ticketLink.findMany({
      where: projectId ? { source: { projectId } } : {},
      orderBy: { createdAt: "desc" },
      take: each,
      select: {
        id: true,
        createdAt: true,
        createdBy: { select: { name: true, email: true } },
        source: {
          select: { id: true, key: true, project: { select: { key: true } } },
        },
        target: { select: { key: true } },
      },
    }),
  ]);

  // La PREMIÈRE révision d'une page est sa création, les suivantes des retouches :
  // c'est la seule façon de distinguer « a créé » de « a modifié ».
  const firstRevisionByPage = new Map<string, string>();
  if (revisions.length > 0) {
    const firsts = await prisma.wikiRevision.findMany({
      where: { pageId: { in: [...new Set(revisions.map((r) => r.page.id))] } },
      // Le tri COMMENCE par `pageId` : c'est ce qui permet à PostgreSQL de
      // dédoublonner lui-même, au lieu de rapatrier toutes les révisions pour
      // le faire en mémoire. `id` départage deux révisions de même horodatage,
      // faute de quoi « la première » serait arbitraire.
      orderBy: [{ pageId: "asc" }, { createdAt: "asc" }, { id: "asc" }],
      distinct: ["pageId"],
      select: { id: true, pageId: true },
    });
    for (const f of firsts) firstRevisionByPage.set(f.pageId, f.id);
  }

  const rows: ActivityRow[] = [
    ...tickets.map((t) => ({
      id: `ticket:${t.id}`,
      kind: "ticket" as const,
      at: t.createdAt,
      href: `/projects/${t.project.key}/tickets/${t.id}`,
      target: t.key,
      projectKey: t.project.key,
      actor: personLabel(t.reporter),
      detail: t.title,
    })),
    ...comments.map((c) => ({
      id: `comment:${c.id}`,
      kind: "comment" as const,
      at: c.createdAt,
      href: `/projects/${c.ticket.project.key}/tickets/${c.ticket.id}`,
      target: c.ticket.key,
      projectKey: c.ticket.project.key,
      actor: personLabel(c.author),
      detail: c.ticket.title,
    })),
    ...revisions.map((r) => ({
      id: `revision:${r.id}`,
      kind:
        firstRevisionByPage.get(r.page.id) === r.id
          ? ("pageCreated" as const)
          : ("page" as const),
      at: r.createdAt,
      href: `/projects/${r.page.project.key}/wiki?page=${r.page.slug ?? r.page.id}`,
      target: r.title,
      projectKey: r.page.project.key,
      actor: personLabel(r.author),
      detail: null,
    })),
    ...attachments.map((a) => ({
      id: `attachment:${a.id}`,
      kind: "attachment" as const,
      at: a.createdAt,
      href: `/projects/${a.ticket.project.key}/tickets/${a.ticket.id}`,
      target: a.ticket.key,
      projectKey: a.ticket.project.key,
      actor: personLabel(a.uploadedBy),
      detail: a.filename,
    })),
    ...links.map((l) => ({
      id: `link:${l.id}`,
      kind: "link" as const,
      at: l.createdAt,
      href: `/projects/${l.source.project.key}/tickets/${l.source.id}`,
      target: l.source.key,
      projectKey: l.source.project.key,
      actor: personLabel(l.createdBy),
      detail: l.target.key,
    })),
  ];

  return rows.sort((a, b) => b.at.getTime() - a.at.getTime()).slice(0, limit);
}
