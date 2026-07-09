import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getBoardData, getMembers, getProjectByKey } from "@/server/queries";
import { KanbanBoard, type CurrentUser } from "@/components/board/kanban-board";

/**
 * Vue Kanban d'un projet (RSC). Charge le projet, ses colonnes/tickets ordonnés
 * et les membres, puis délègue l'interactivité (drag & drop, filtres) au client.
 */
export default async function BoardPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [{ columns }, members, session] = await Promise.all([
    getBoardData(project.id),
    getMembers(),
    auth(),
  ]);

  const currentUser: CurrentUser = session?.user
    ? { id: session.user.id, role: session.user.role ?? Role.REPORTER }
    : { id: "", role: Role.REPORTER };

  return (
    <div className="flex h-dvh flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b px-4 py-3 md:px-6">
        <span className="font-mono text-xs text-muted-foreground">{project.key}</span>
        <h1 className="text-lg font-semibold">{project.name}</h1>
        <span className="text-sm text-muted-foreground">· Tableau</span>
      </header>

      <KanbanBoard
        className="min-h-0 flex-1"
        columns={columns}
        projectId={project.id}
        projectKey={project.key}
        currentUser={currentUser}
        members={members}
      />
    </div>
  );
}
