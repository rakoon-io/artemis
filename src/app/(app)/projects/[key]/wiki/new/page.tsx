import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { parentOptions } from "@/lib/wiki-tree";
import { getAccessibleProjectByKey } from "@/server/access";
import { getTicketRefs, getWikiPages } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";

/** Création d'une page de wiki, pleine page (RSC + formulaire client). */
export default async function NewWikiPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ parent?: string }>;
}) {
  const { key } = await params;
  const { parent } = await searchParams;
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const [tickets, pages] = await Promise.all([
    getTicketRefs(project.id),
    getWikiPages(project.id),
  ]);
  const parents = parentOptions(pages).map((n) => ({
    id: n.page.id,
    title: n.page.title,
    depth: n.depth,
  }));
  // Le parent proposé (bouton « Sous-page ») n'est retenu que s'il existe.
  const defaultParentId =
    parent && pages.some((p) => p.id === parent) ? parent : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="-ml-2">
          <Link href={`/projects/${key}/wiki`}>
            <ArrowLeft />
            Wiki
          </Link>
        </Button>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          Nouvelle page
        </h1>
      </div>
      <WikiPageForm
        projectId={project.id}
        projectKey={project.key}
        tickets={tickets}
        parents={parents}
        defaultParentId={defaultParentId}
      />
    </div>
  );
}
