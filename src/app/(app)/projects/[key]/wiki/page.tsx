import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Pencil, Plus } from "lucide-react";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { cn, formatDate } from "@/lib/utils";
import { ancestorsOf, orderedTree } from "@/lib/wiki-tree";
import { MAX_REVISIONS_LISTED } from "@/server/services/wiki.service";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getPageRevision,
  getPageRevisions,
  getSpecPackageForPage,
  getSpecVersion,
  getSpecVersions,
  getTicketKeys,
  getWikiPage,
  getWikiPages,
  searchWikiPages,
} from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiSearch } from "@/components/wiki/wiki-search";
import { DeleteWikiPageButton } from "@/components/wiki/delete-wiki-page-button";
import { MarkSpecButton, SpecPanel } from "@/components/wiki/spec-panel";
import { SpecVersionView } from "@/components/wiki/spec-version-view";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

interface WikiListItem {
  id: string;
  title: string;
  snippet?: string;
}

/**
 * Wiki d'un projet (RSC) : recherche + barre latérale des pages + page rendue en
 * Markdown. Les citations de tickets deviennent des liens. Édition ouverte aux
 * utilisateurs connectés ; suppression réservée aux administrateurs.
 */
export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ page?: string; q?: string; spec?: string; rev?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const requestedId = sp.page;
  const q = (sp.q ?? "").trim();

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  // Lecture d'une VERSION PUBLIÉE : on sort de l'arborescence courante. Un
  // instantané n'est pas un état du wiki, c'est un document clos - le mêler à la
  // navigation habituelle laisserait croire qu'il est encore modifiable.
  if (sp.spec) {
    const [version, keys] = await Promise.all([
      getSpecVersion(sp.spec),
      getTicketKeys(project.id),
    ]);
    if (!version || version.package.projectId !== project.id) notFound();
    return (
      <SpecVersionView
        version={version}
        projectKey={project.key}
        ticketMap={Object.fromEntries(
          keys.map((k) => [k.key.toUpperCase(), k.id]),
        )}
      />
    );
  }

  const [allPages, ticketKeys] = await Promise.all([
    getWikiPages(project.id),
    getTicketKeys(project.id),
  ]);
  const admin = isAdmin(session?.user);
  const t = await getDictionary();

  const results = q ? await searchWikiPages(project.id, q) : null;
  const list: WikiListItem[] =
    results ?? allPages.map((p) => ({ id: p.id, title: p.title }));

  const selectedId = requestedId ?? list[0]?.id;
  const selected = selectedId ? await getWikiPage(selectedId) : null;
  const current =
    selected && selected.projectId === project.id ? selected : null;

  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((t) => [t.key.toUpperCase(), t.id]),
  );

  // Spécification : la page courante appartient-elle à un paquet, et en est-elle
  // la racine ? Les versions ne sont chargées que dans ce dernier cas - c'est là
  // seulement qu'elles se publient et se consultent.
  const pack = current
    ? await getSpecPackageForPage(project.id, current.id)
    : null;
  const isSpecRoot = !!pack && pack.rootPageId === current?.id;
  const [specVersions, revisions, readRevision] = await Promise.all([
    isSpecRoot ? getSpecVersions(pack.id) : Promise.resolve([]),
    current ? getPageRevisions(current.id) : Promise.resolve([]),
    sp.rev ? getPageRevision(sp.rev) : Promise.resolve(null),
  ]);
  // Une révision ne se lit que sur SA page : un identifiant emprunté à une autre
  // page (ou à un autre projet) est ignoré, pas affiché.
  const frozen =
    readRevision &&
    current &&
    readRevision.page.id === current.id &&
    readRevision.page.projectId === project.id
      ? readRevision
      : null;

  // Arborescence (hors recherche) et fil d'Ariane de la page courante.
  const tree = orderedTree(allPages);
  const trail = current ? ancestorsOf(allPages, current.id) : [];

  const createButton = (
    <Button asChild>
      <Link href={`/projects/${project.key}/wiki/new`}>
        <Plus />
        {t.wiki.newPage}
      </Link>
    </Button>
  );

  const pageHref = (id: string) =>
    q
      ? `/projects/${project.key}/wiki?page=${id}&q=${encodeURIComponent(q)}`
      : `/projects/${project.key}/wiki?page=${id}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.wiki.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            {t.wiki.index.subtitle}
          </p>
        </div>
        {createButton}
      </div>

      {allPages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">{t.wiki.index.emptyTitle}</p>
            <p className="text-sm text-muted-foreground">
              {t.wiki.index.emptyDescription}
            </p>
          </div>
          {createButton}
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="shrink-0 space-y-3 md:w-64">
            <WikiSearch projectKey={project.key} initialQuery={q} />
            {q && (
              <p className="px-1 text-xs text-muted-foreground">
                {list.length} {t.wiki.index.result}
                {list.length > 1 ? "s" : ""}{" "}
                {fmt(t.wiki.index.forQuery, { q })}
              </p>
            )}
            <nav
              className="flex flex-col gap-0.5"
              aria-label={t.wiki.index.pagesNavLabel}
            >
              {q ? (
                // Résultats de recherche : liste plate avec extraits.
                list.length === 0 ? (
                  <p className="px-3 py-2 text-sm text-muted-foreground">
                    {t.wiki.index.noPagesFound}
                  </p>
                ) : (
                  list.map((p) => (
                    <Link
                      key={p.id}
                      href={pageHref(p.id)}
                      aria-current={p.id === current?.id ? "page" : undefined}
                      className={cn(
                        "block rounded-md px-3 py-2 text-sm transition-colors",
                        p.id === current?.id
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                      )}
                    >
                      <span className="block truncate font-medium">
                        {p.title}
                      </span>
                      {p.snippet && (
                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                          {p.snippet}
                        </span>
                      )}
                    </Link>
                  ))
                )
              ) : (
                // Arborescence : indentation par profondeur.
                tree.map(({ page: p, depth }) => (
                  <Link
                    key={p.id}
                    href={pageHref(p.id)}
                    aria-current={p.id === current?.id ? "page" : undefined}
                    style={{ paddingLeft: `${12 + depth * 16}px` }}
                    className={cn(
                      "block truncate rounded-md py-2 pr-3 text-sm transition-colors",
                      p.id === current?.id
                        ? "bg-accent font-medium text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                    )}
                  >
                    {p.title}
                  </Link>
                ))
              )}
            </nav>
          </aside>

          <div className="min-w-0 flex-1">
            {current ? (
              <article className="space-y-4">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div className="space-y-1">
                    {trail.length > 0 && (
                      <nav
                        aria-label={t.wiki.index.breadcrumbLabel}
                        className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground"
                      >
                        {trail.map((a) => (
                          <span key={a.id} className="flex items-center gap-1">
                            <Link
                              href={pageHref(a.id)}
                              className="hover:text-foreground hover:underline"
                            >
                              {a.title}
                            </Link>
                            <span aria-hidden>/</span>
                          </span>
                        ))}
                      </nav>
                    )}
                    <h2 className="text-xl font-semibold tracking-tight">
                      {current.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {current.author?.name ??
                        current.author?.email ??
                        t.wiki.index.unknownAuthor}
                      {t.wiki.index.editedOn}
                      {formatDate(current.updatedAt)}
                    </p>
                    {/* Signalé sur TOUTE page du paquet, pas seulement la
                        racine : en arrivant sur un chapitre par la recherche,
                        on doit savoir qu'on lit une spécification et laquelle. */}
                    {pack && (
                      <p className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="secondary">
                          {isSpecRoot
                            ? t.wiki.specs.rootBadge
                            : t.wiki.specs.badge}
                        </Badge>
                        {!isSpecRoot && (
                          <Link
                            href={pageHref(pack.rootPageId)}
                            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                          >
                            {fmt(t.wiki.specs.partOf, {
                              title: pack.rootPage.title,
                            })}
                          </Link>
                        )}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/projects/${project.key}/wiki/new?parent=${current.id}`}
                      >
                        <Plus />
                        {t.wiki.index.subpage}
                      </Link>
                    </Button>
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/projects/${project.key}/wiki/${current.id}/edit`}
                      >
                        <Pencil />
                        {t.common.edit}
                      </Link>
                    </Button>
                    {admin && !pack && (
                      <MarkSpecButton
                        projectId={project.id}
                        pageId={current.id}
                        pageTitle={current.title}
                      />
                    )}
                    {admin && (
                      <DeleteWikiPageButton
                        pageId={current.id}
                        pageTitle={current.title}
                        projectKey={project.key}
                      />
                    )}
                  </div>
                </div>

                {isSpecRoot && pack && (
                  <SpecPanel
                    packageId={pack.id}
                    rootTitle={pack.rootPage.title}
                    projectKey={project.key}
                    isAdmin={admin}
                    versions={specVersions.map((v) => ({
                      id: v.id,
                      number: v.number,
                      label: v.label,
                      note: v.note,
                      createdAt: v.createdAt,
                      publishedBy: v.publishedBy,
                      pageCount: v._count.pages,
                    }))}
                  />
                )}

                {frozen ? (
                  <div className="space-y-3">
                    {/* Bandeau explicite : sans lui, on croirait lire la page
                        courante et l'on s'étonnerait que « Modifier » n'ait
                        aucun effet sur ce qu'on voit. */}
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3">
                      <p className="text-xs text-muted-foreground">
                        {fmt(t.wiki.history.frozenNotice, {
                          date: formatDate(frozen.createdAt),
                        })}
                        {frozen.author
                          ? ` ${fmt(t.wiki.history.by, {
                              name:
                                frozen.author.name ??
                                frozen.author.email ??
                                t.wiki.history.unknownAuthor,
                            })}`
                          : ""}
                      </p>
                      <Button asChild variant="outline" size="sm">
                        <Link href={pageHref(current.id)}>
                          {t.wiki.history.backToPage}
                        </Link>
                      </Button>
                    </div>
                    {frozen.content.trim() ? (
                      <WikiContent
                        content={frozen.content}
                        projectKey={project.key}
                        ticketMap={ticketMap}
                      />
                    ) : (
                      <p className="text-sm italic text-muted-foreground">
                        {t.wiki.form.nothingToPreview}
                      </p>
                    )}
                  </div>
                ) : current.content.trim() ? (
                  <WikiContent
                    content={current.content}
                    projectKey={project.key}
                    ticketMap={ticketMap}
                  />
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    {fmt(t.wiki.index.emptyContentHint, {
                      action: t.common.edit,
                    })}
                  </p>
                )}

                {/* Historique : une révision par enregistrement qui a changé le
                    titre ou le contenu. La première de la liste correspond à
                    l'état courant, d'où la mention « actuelle ». */}
                {revisions.length > 0 && (
                  <details className="rounded-lg border p-3">
                    <summary className="cursor-pointer text-sm font-medium">
                      {t.wiki.history.title} ({revisions.length})
                    </summary>
                    <ul className="mt-3 space-y-1">
                      {revisions.map((revision, index) => {
                        const author =
                          revision.author?.name ??
                          revision.author?.email ??
                          t.wiki.history.unknownAuthor;
                        const active = frozen?.id === revision.id;
                        return (
                          <li key={revision.id}>
                            <Link
                              href={`${pageHref(current.id)}&rev=${revision.id}`}
                              className={cn(
                                "flex flex-wrap items-center gap-2 rounded-md px-2 py-1 text-xs hover:bg-accent",
                                active && "bg-accent font-medium",
                              )}
                            >
                              <span>{formatDate(revision.createdAt)}</span>
                              <span className="text-muted-foreground">
                                {fmt(t.wiki.history.by, { name: author })}
                              </span>
                              {index === 0 && (
                                <Badge variant="secondary">
                                  {t.wiki.history.current}
                                </Badge>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                    {revisions.length >= MAX_REVISIONS_LISTED && (
                      <p className="mt-2 px-2 text-xs text-muted-foreground">
                        {fmt(t.wiki.history.truncated, {
                          count: MAX_REVISIONS_LISTED,
                        })}
                      </p>
                    )}
                  </details>
                )}
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t.wiki.index.selectPagePrompt}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
