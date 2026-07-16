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
} from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { WikiPageDialog } from "@/components/wiki/wiki-page-dialog";
import { DeleteWikiPageButton } from "@/components/wiki/delete-wiki-page-button";

/**
 * Wiki d'un projet (RSC) : barre latérale des pages + page sélectionnée. Le contenu
 * rend les citations de tickets (RKN-123) en liens. Édition ouverte aux utilisateurs
 * connectés ; suppression réservée aux administrateurs.
 */
export default async function WikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { key } = await params;
  const { page: requestedId } = await searchParams;

  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [pages, ticketKeys, session] = await Promise.all([
    getWikiPages(project.id),
    getTicketKeys(project.id),
    auth(),
  ]);
  const admin = isAdmin(session?.user);

  const selectedId = requestedId ?? pages[0]?.id;
  const selected = selectedId ? await getWikiPage(selectedId) : null;
  // Ne pas afficher une page d'un autre projet passée via l'URL.
  const current =
    selected && selected.projectId === project.id ? selected : null;

  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((t) => [t.key.toUpperCase(), t.id]),
  );

  const createTrigger = (
    <Button>
      <Plus />
      Nouvelle page
    </Button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Wiki</h1>
          <p className="text-sm text-muted-foreground">
            Documentation du projet. Citez des tickets avec leur clé (ex. RKN-3).
          </p>
        </div>
        <WikiPageDialog
          projectId={project.id}
          projectKey={project.key}
          trigger={createTrigger}
        />
      </div>

      {pages.length === 0 ? (
        <div className="flex flex-col items-center gap-4 rounded-lg border border-dashed p-12 text-center">
          <FileText className="size-8 text-muted-foreground" />
          <div className="space-y-1">
            <p className="font-medium">Aucune page pour l&apos;instant</p>
            <p className="text-sm text-muted-foreground">
              Créez la première page de documentation de ce projet.
            </p>
          </div>
          <WikiPageDialog
            projectId={project.id}
            projectKey={project.key}
            trigger={createTrigger}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-6 md:flex-row">
          <aside className="shrink-0 md:w-60">
            <nav className="flex flex-col gap-0.5" aria-label="Pages du wiki">
              {pages.map((p) => (
                <Link
                  key={p.id}
                  href={`/projects/${project.key}/wiki?page=${p.id}`}
                  aria-current={p.id === current?.id ? "page" : undefined}
                  className={cn(
                    "truncate rounded-md px-3 py-2 text-sm transition-colors",
                    p.id === current?.id
                      ? "bg-accent font-medium text-accent-foreground"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                  )}
                >
                  {p.title}
                </Link>
              ))}
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
                    <WikiPageDialog
                      projectId={project.id}
                      projectKey={project.key}
                      page={{
                        id: current.id,
                        title: current.title,
                        content: current.content,
                      }}
                      trigger={
                        <Button variant="outline" size="sm">
                          <Pencil />
                          Éditer
                        </Button>
                      }
                    />
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
