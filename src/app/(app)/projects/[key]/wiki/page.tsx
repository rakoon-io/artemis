import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Pencil, Plus } from "lucide-react";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { cn, formatDate } from "@/lib/utils";
import {
  getProjectByKey,
  getTicketKeys,
  getWikiPage,
  getWikiPages,
  searchWikiPages,
} from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiSearch } from "@/components/wiki/wiki-search";
import { DeleteWikiPageButton } from "@/components/wiki/delete-wiki-page-button";

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
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  const requestedId = sp.page;
  const q = (sp.q ?? "").trim();

  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [allPages, ticketKeys, session] = await Promise.all([
    getWikiPages(project.id),
    getTicketKeys(project.id),
    auth(),
  ]);
  const admin = isAdmin(session?.user);

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

  const createButton = (
    <Button asChild>
      <Link href={`/projects/${project.key}/wiki/new`}>
        <Plus />
        Nouvelle page
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
          <h1 className="text-2xl font-semibold tracking-tight">Wiki</h1>
          <p className="text-sm text-muted-foreground">
            Documentation du projet en Markdown. Citez une tâche avec @ (ex.
            @RKN-3).
          </p>
        </div>
        {createButton}
      </div>

      {allPages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Aucune page pour l&apos;instant</p>
            <p className="text-sm text-muted-foreground">
              Créez la première page de documentation de ce projet.
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
                {list.length} résultat{list.length > 1 ? "s" : ""} pour «&nbsp;{q}
                &nbsp;»
              </p>
            )}
            <nav className="flex flex-col gap-0.5" aria-label="Pages du wiki">
              {list.length === 0 ? (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  Aucune page trouvée.
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
                    <span className="block truncate font-medium">{p.title}</span>
                    {p.snippet && (
                      <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                        {p.snippet}
                      </span>
                    )}
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
                    <h2 className="text-xl font-semibold tracking-tight">
                      {current.title}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {current.author?.name ?? current.author?.email ?? "Inconnu"}
                      {" - modifiée le "}
                      {formatDate(current.updatedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button asChild variant="outline" size="sm">
                      <Link
                        href={`/projects/${project.key}/wiki/${current.id}/edit`}
                      >
                        <Pencil />
                        Éditer
                      </Link>
                    </Button>
                    {admin && (
                      <DeleteWikiPageButton
                        pageId={current.id}
                        pageTitle={current.title}
                        projectKey={project.key}
                      />
                    )}
                  </div>
                </div>

                {current.content.trim() ? (
                  <WikiContent
                    content={current.content}
                    projectKey={project.key}
                    ticketMap={ticketMap}
                  />
                ) : (
                  <p className="text-sm italic text-muted-foreground">
                    Cette page est vide. Cliquez sur « Éditer » pour la remplir.
                  </p>
                )}
              </article>
            ) : (
              <p className="text-sm text-muted-foreground">
                Sélectionnez une page dans la liste.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
