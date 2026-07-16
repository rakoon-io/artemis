import type { CSSProperties, ReactNode } from "react";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getAccessibleProjectByKey } from "@/server/access";
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
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const admin = isAdmin(session?.user);

  return (
    <div
      className="flex flex-col gap-4 px-4 py-5 md:px-6"
      style={
        project.accentColor
          ? ({
              ["--primary"]: project.accentColor,
              ["--ring"]: project.accentColor,
            } as CSSProperties)
          : undefined
      }
    >
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
