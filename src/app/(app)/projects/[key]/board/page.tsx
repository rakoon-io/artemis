import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getAssignableUsers,
  getBoardData,
  getLabels,
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
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const [{ columns }, members, types, priorities, labels, sprints] =
    await Promise.all([
      getBoardData(project.id),
      getAssignableUsers(project.id),
      getTicketTypes(project.id),
      getTicketPriorities(project.id),
      getLabels(project.id),
      getSprints(project.id),
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
