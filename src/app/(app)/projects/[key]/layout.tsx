import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getProjectByKey } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { ProjectNav } from "@/components/project/project-nav";

/** Layout d'un projet : charge le projet, affiche l'en-tête et les onglets. */
export default async function ProjectLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const [project, session] = await Promise.all([getProjectByKey(key), auth()]);
  if (!project) notFound();

  const admin = isAdmin(session?.user);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Badge variant="secondary">{project.key}</Badge>
          <h1 className="text-xl font-semibold tracking-tight">
            {project.name}
          </h1>
        </div>
        <ProjectNav projectKey={project.key} isAdmin={admin} />
      </div>
      {children}
    </div>
  );
}
