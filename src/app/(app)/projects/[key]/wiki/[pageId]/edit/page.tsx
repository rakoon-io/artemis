import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { parentOptions } from "@/lib/wiki-tree";
import { getAccessibleProjectByKey } from "@/server/access";
import { getTicketRefs, getWikiPage, getWikiPages } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";
import { getDictionary } from "@/i18n/server";

/** Édition d'une page de wiki, pleine page. */
export default async function EditWikiPage({
  params,
}: {
  params: Promise<{ key: string; pageId: string }>;
}) {
  const { key, pageId } = await params;
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();
  const t = await getDictionary();

  const [page, tickets, pages] = await Promise.all([
    getWikiPage(pageId),
    getTicketRefs(project.id),
    getWikiPages(project.id),
  ]);
  if (!page || page.projectId !== project.id) notFound();

  // Options de parent : tout l'arbre sauf la page et ses descendants (anti-cycle).
  const parents = parentOptions(pages, page.id).map((n) => ({
    id: n.page.id,
    title: n.page.title,
    depth: n.depth,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/projects/${key}/wiki?page=${page.id}`}>
            <ArrowLeft />
            {t.wiki.form.back}
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {t.wiki.form.editTitle}
        </h1>
      </div>
      <WikiPageForm
        projectId={project.id}
        projectKey={project.key}
        tickets={tickets}
        parents={parents}
        page={{
          id: page.id,
          title: page.title,
          content: page.content,
          parentId: page.parentId,
        }}
      />
    </div>
  );
}
