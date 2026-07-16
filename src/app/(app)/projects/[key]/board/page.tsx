import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import {
  getBoardData,
  getLabels,
  getMembers,
  getProjectByKey,
  getSprints,
  getTicketPriorities,
  getTicketTypes,
} from "@/server/queries";
import { KanbanBoard, type CurrentUser } from "@/components/board/kanban-board";
import { CreateTicketDialog } from "@/components/ticket/create-ticket-dialog";

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

  const [{ columns }, members, types, priorities, labels, sprints, session] =
    await Promise.all([
      getBoardData(project.id),
      getMembers(),
      getTicketTypes(project.id),
      getTicketPriorities(project.id),
      getLabels(project.id),
      getSprints(project.id),
      auth(),
    ]);

  const currentUser: CurrentUser = session?.user
    ? { id: session.user.id, role: session.user.role ?? Role.REPORTER }
    : { id: "", role: Role.REPORTER };

  return (
    <KanbanBoard
      className="h-[calc(100dvh-12rem)]"
      columns={columns}
      projectId={project.id}
      projectKey={project.key}
      currentUser={currentUser}
      members={members}
      types={types}
      priorities={priorities}
      action={
        <CreateTicketDialog
          projectId={project.id}
          members={members}
          sprints={sprints}
          labels={labels}
          types={types}
          priorities={priorities}
        />
      }
    />
  );
}
