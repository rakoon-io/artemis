import { notFound } from "next/navigation";
import { SprintState } from "@prisma/client";

import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getBacklogTickets,
  getColumns,
  getSprintsWithTickets,
} from "@/server/queries";
import { isTicketDone, undoneFirst } from "@/lib/release-progress";
import { getDictionary } from "@/i18n/server";
import { Badge } from "@/components/ui/badge";
import { CreateSprintDialog } from "@/components/sprint/create-sprint-dialog";
import { SprintCard, SprintTicketItem } from "@/components/sprint/sprint-card";
import {
  SprintDndProvider,
  TicketDropZone,
} from "@/components/sprint/sprint-dnd";

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

  const [sprints, backlog, columns] = await Promise.all([
    getSprintsWithTickets(project.id),
    getBacklogTickets(project.id),
    getColumns(project.id),
  ]);

  /**
   * Rang de la DERNIÈRE colonne : c'est lui qui dit ce qui est achevé. On ne se
   * fie jamais au nom « Terminé » - un projet renomme ses colonnes, en ajoute,
   * les traduit. Même calcul que sur la page Versions, même règle.
   */
  const lastColumnOrder = columns.length
    ? Math.max(...columns.map((column) => column.order))
    : Number.MAX_SAFE_INTEGER;
  const sprintOptions = sprints.map((s) => ({ id: s.id, name: s.name }));

  const isEmpty = sprints.length === 0 && backlog.length === 0;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.sprints.title}
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t.sprints.subtitleLead}{" "}
            <strong className="font-medium text-foreground">
              {t.sprints.lot}
            </strong>{" "}
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
        /**
         * PLANIFIER, C'EST PUISER : les sprints à gauche, la réserve à droite.
         *
         * Les deux étaient empilés, et les sprints rangés dans une grille à deux
         * colonnes - si bien qu'un sprint seul dans son état occupait la moitié
         * d'une moitié, laissant les trois quarts de l'écran vides. Côte à côte,
         * on voit ce qu'on remplit ET ce dans quoi on puise, ce qui est le geste
         * même de cette page.
         */
        <SprintDndProvider
          sprintNames={Object.fromEntries(sprints.map((s) => [s.id, s.name]))}
        >
          <div className="grid items-start gap-8 xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
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
                    {/* Pleine largeur de la colonne : les tickets d'un sprint se
                    lisent en lignes, pas en vignettes. */}
                    <div className="space-y-4">
                      {items.map((sprint) => (
                        <SprintCard
                          key={sprint.id}
                          sprint={sprint}
                          tickets={sprint.tickets}
                          projectKey={project.key}
                          sprintOptions={sprintOptions}
                          lastColumnOrder={lastColumnOrder}
                          currentUser={session?.user ?? null}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>

            {/**
             * La réserve reste visible pendant qu'on remplit les sprints - et se
             * range sous eux dès que l'écran ne peut plus les mettre côte à côte.
             *
             * `top-16` et non `top-4` : la barre du haut est elle-même collante et
             * haute de 57 pixels. À seize, la réserve venait se coller SOUS elle -
             * quarante et un pixels avalés, mesurés, dont son propre intitulé. Elle
             * paraissait ne pas tenir alors qu'elle tenait, mais trop haut.
             */}
            <section className="space-y-3 xl:sticky xl:top-16">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.sprints.backlog}
                </h2>
                <Badge variant="outline">{backlog.length}</Badge>
                <span className="text-xs text-muted-foreground">
                  {t.sprints.ticketsWithoutSprint}
                </span>
              </div>
              <TicketDropZone sprintId={null}>
                {backlog.length === 0 ? (
                  <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
                    {t.sprints.backlogEmpty}
                  </p>
                ) : (
                  <ul className="slim-scrollbar max-h-[calc(100dvh-16rem)] divide-y overflow-y-auto rounded-lg border [&>li:empty]:hidden">
                    {undoneFirst(backlog, lastColumnOrder).map((ticket) => (
                      <li key={ticket.id}>
                        <SprintTicketItem
                          ticket={ticket}
                          projectKey={project.key}
                          currentSprintId={null}
                          sprintOptions={sprintOptions}
                          done={isTicketDone(ticket, lastColumnOrder)}
                          currentUser={session?.user ?? null}
                        />
                      </li>
                    ))}
                  </ul>
                )}
              </TicketDropZone>
            </section>
          </div>
        </SprintDndProvider>
      )}
    </div>
  );
}
