import { notFound } from "next/navigation";
import { SprintState } from "@prisma/client";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import {
  getBacklogTickets,
  getProjectByKey,
  getSprintsWithTickets,
} from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { CreateSprintDialog } from "@/components/sprint/create-sprint-dialog";
import { SprintCard, SprintTicketItem } from "@/components/sprint/sprint-card";

/** Groupes affichés, dans l'ordre Actif, Planifiés, Terminés. */
const GROUPS = [
  { state: SprintState.ACTIVE, label: "Actif" },
  { state: SprintState.PLANNED, label: "Planifiés" },
  { state: SprintState.COMPLETED, label: "Terminés" },
] as const;

/**
 * Sprints et lots d'un projet (RSC). Liste les sprints regroupés par état avec
 * leurs tickets, plus le backlog (tickets sans sprint). Chaque ticket peut être
 * distribué dans un sprint (ou renvoyé au backlog) via son menu.
 */
export default async function SprintsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [sprints, backlog, session] = await Promise.all([
    getSprintsWithTickets(project.id),
    getBacklogTickets(project.id),
    auth(),
  ]);
  const admin = isAdmin(session?.user);
  const sprintOptions = sprints.map((s) => ({ id: s.id, name: s.name }));

  const isEmpty = sprints.length === 0 && backlog.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Sprints et lots</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Distribuez les tickets du backlog dans les sprints. Un{" "}
            <strong className="font-medium text-foreground">lot</strong> est un
            sprint sans dates ; ajoutez des dates et un objectif pour en faire une
            itération.
          </p>
        </div>
        {admin && <CreateSprintDialog projectId={project.id} />}
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun sprint ni ticket pour l&apos;instant.
          {admin ? " Créez un sprint pour commencer à planifier." : ""}
        </div>
      ) : (
        <div className="space-y-8">
          {GROUPS.map((group) => {
            const items = sprints.filter((s) => s.state === group.state);
            if (items.length === 0) return null;
            return (
              <section key={group.state} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {group.label}
                  </h2>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                  {items.map((sprint) => (
                    <SprintCard
                      key={sprint.id}
                      sprint={sprint}
                      tickets={sprint.tickets}
                      projectKey={project.key}
                      sprintOptions={sprintOptions}
                      isAdmin={admin}
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Backlog
              </h2>
              <Badge variant="outline">{backlog.length}</Badge>
              <span className="text-xs text-muted-foreground">
                tickets sans sprint
              </span>
            </div>
            {backlog.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                Le backlog est vide : tous les tickets sont rattachés à un sprint.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {backlog.map((ticket) => (
                  <li key={ticket.id}>
                    <SprintTicketItem
                      ticket={ticket}
                      projectKey={project.key}
                      currentSprintId={null}
                      sprintOptions={sprintOptions}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
