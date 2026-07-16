import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProjectByKey, getTicketKeys, getWikiPage } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";

/** Édition d'une page de wiki, pleine page. */
export default async function EditWikiPage({
  params,
}: {
  params: Promise<{ key: string; pageId: string }>;
}) {
  const { key, pageId } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [page, ticketKeys] = await Promise.all([
    getWikiPage(pageId),
    getTicketKeys(project.id),
  ]);
  if (!page || page.projectId !== project.id) notFound();

  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((t) => [t.key.toUpperCase(), t.id]),
  );

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/projects/${key}/wiki?page=${page.id}`}>
            <ArrowLeft />
            Retour
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Éditer la page
        </h1>
      </div>
      <WikiPageForm
        projectId={project.id}
        projectKey={project.key}
        ticketMap={ticketMap}
        page={{ id: page.id, title: page.title, content: page.content }}
      />
    </div>
  );
}
