import { notFound } from "next/navigation";
import { Role } from "@prisma/client";

import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getAssignableUsers,
  getBoardData,
  getComponents,
  getLabels,
  getModules,
  getSprints,
  getTicketPriorities,
  getTicketTypes,
} from "@/server/queries";
import { KanbanBoard, type CurrentUser } from "@/components/board/kanban-board";
import { CreateTicketDialog } from "@/components/ticket/create-ticket-dialog";
import { GenerateTicketsDialog } from "@/components/ticket/generate-tickets-dialog";
import { isMistralConfigured } from "@/lib/mistral";

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

  const [
    { columns },
    members,
    types,
    priorities,
    labels,
    sprints,
    components,
    modules,
  ] = await Promise.all([
      getBoardData(project.id),
      getAssignableUsers(project.id),
      getTicketTypes(project.id),
      getTicketPriorities(project.id),
      getLabels(project.id),
      getSprints(project.id),
    getComponents(project.id),
    getModules(project.id),
  ]);

  const currentUser: CurrentUser = session?.user
    ? { id: session.user.id, role: session.user.role ?? Role.REPORTER }
    : { id: "", role: Role.REPORTER };

  // Bouton « Créer depuis un texte » (notes de réunion → tickets) visible sur le
  // Kanban uniquement si l'intégration IA est configurée côté serveur.
  const aiEnabled = isMistralConfigured();

  return (
    <KanbanBoard
      /* Ce qui reste sous l'en-tête et au-dessus du pied de page. La hauteur
         était calculée en dur - « 100dvh moins 12rem » - et se trompait de
         49 pixels : le bandeau du projet en fait 220, et le pied de page n'était
         pas compté du tout. D'où une page plus haute que l'écran, et du vide
         sous le pied. */
      className="min-h-0 flex-1"
      columns={columns}
      projectId={project.id}
      projectKey={project.key}
      currentUser={currentUser}
      members={members}
      types={types}
      priorities={priorities}
      components={components}
      modules={modules}
      action={
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && (
            <GenerateTicketsDialog
              projectId={project.id}
              projectName={project.name}
              types={types}
              priorities={priorities}
              components={components}
            />
          )}
          <CreateTicketDialog
            projectId={project.id}
            members={members}
            sprints={sprints}
            labels={labels}
            types={types}
            priorities={priorities}
            components={components}
            modules={modules}
          />
        </div>
      }
    />
  );
}
