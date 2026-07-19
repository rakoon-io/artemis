import { notFound } from "next/navigation";
import { SprintState } from "@prisma/client";

import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getBacklogTickets,
  getSprintsWithTickets,
} from "@/server/queries";
import { getDictionary } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import { CreateSprintDialog } from "@/components/sprint/create-sprint-dialog";
import { SprintCard, SprintTicketItem } from "@/components/sprint/sprint-card";

/** Groupes affichés, dans l'ordre Actif, Planifiés, Terminés. */
const GROUPS = [
  { state: SprintState.ACTIVE, labelKey: "groupActive" },
  { state: SprintState.PLANNED, labelKey: "groupPlanned" },
  { state: SprintState.COMPLETED, labelKey: "groupCompleted" },
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
  const t = await getDictionary();
  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const [sprints, backlog] = await Promise.all([
    getSprintsWithTickets(project.id),
    getBacklogTickets(project.id),
  ]);
  const sprintOptions = sprints.map((s) => ({ id: s.id, name: s.name }));

  const isEmpty = sprints.length === 0 && backlog.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">{t.sprints.title}</h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t.sprints.subtitleLead}{" "}
            <strong className="font-medium text-foreground">{t.sprints.lot}</strong>{" "}
            {t.sprints.subtitleTail}
          </p>
        </div>
        <CreateSprintDialog projectId={project.id} />
      </div>

      {isEmpty ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t.sprints.emptyState}
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
                    {t.sprints[group.labelKey]}
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
                    />
                  ))}
                </div>
              </section>
            );
          })}

          <section className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t.sprints.backlog}
              </h2>
              <Badge variant="outline">{backlog.length}</Badge>
              <span className="text-xs text-muted-foreground">
                {t.sprints.ticketsWithoutSprint}
              </span>
            </div>
            {backlog.length === 0 ? (
              <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                {t.sprints.backlogEmpty}
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
