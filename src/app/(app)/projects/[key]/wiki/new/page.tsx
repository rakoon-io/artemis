import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { getProjectByKey, getTicketKeys } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";

/** Création d'une page de wiki, pleine page (RSC + formulaire client). */
export default async function NewWikiPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const ticketKeys = await getTicketKeys(project.id);
  const ticketMap: Record<string, string> = Object.fromEntries(
    ticketKeys.map((t) => [t.key.toUpperCase(), t.id]),
  );

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
        ticketMap={ticketMap}
      />
    </div>
  );
}
