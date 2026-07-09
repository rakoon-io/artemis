import { notFound } from "next/navigation";
import { SprintState } from "@prisma/client";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getProjectByKey, getSprints } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { CreateSprintDialog } from "@/components/sprint/create-sprint-dialog";
import { SprintCard } from "@/components/sprint/sprint-card";

/** Groupes affichés, dans l'ordre Planifiés → Actif → Terminés. */
const GROUPS = [
  { state: SprintState.PLANNED, label: "Planifiés" },
  { state: SprintState.ACTIVE, label: "Actif" },
  { state: SprintState.COMPLETED, label: "Terminés" },
] as const;

/**
 * Sprints & lots d'un projet (RSC). Liste les sprints regroupés par état ;
 * les actions d'administration (créer / démarrer / clôturer / supprimer) ne
 * sont proposées qu'aux administrateurs.
 */
export default async function SprintsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [sprints, session] = await Promise.all([
    getSprints(project.id),
    auth(),
  ]);
  const admin = isAdmin(session?.user);

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">
            {project.key}
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.name} — Sprints &amp; lots
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            Un{" "}
            <strong className="font-medium text-foreground">lot</strong> est un
            sprint sans dates ; ajoutez des dates et un objectif pour en faire
            une itération.
          </p>
        </div>
        {admin && <CreateSprintDialog projectId={project.id} />}
      </div>

      {sprints.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          Aucun sprint pour l&apos;instant.
          {admin ? " Créez-en un pour commencer à planifier." : ""}
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
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((sprint) => (
                    <SprintCard
                      key={sprint.id}
                      sprint={sprint}
                      isAdmin={admin}
                    />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
