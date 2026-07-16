import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import { getTicketRefs } from "@/server/queries";
import { Button } from "@/components/ui/button";
import { WikiPageForm } from "@/components/wiki/wiki-page-form";

/** Création d'une page de wiki, pleine page (RSC + formulaire client). */
export default async function NewWikiPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const tickets = await getTicketRefs(project.id);

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
      />
    </div>
  );
}
