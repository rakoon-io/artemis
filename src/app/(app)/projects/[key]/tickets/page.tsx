import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  getLabels,
  getMembers,
  getProjectByKey,
  getSprints,
  getTicketPriorities,
  getTicketsList,
  getTicketTypes,
} from "@/server/queries";
import { CreateTicketDialog } from "@/components/ticket/create-ticket-dialog";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import { TicketTable } from "@/components/ticket/ticket-table";

type SearchParams = { [key: string]: string | string[] | undefined };

/** Renvoie la 1re valeur d'un paramètre de recherche (chaîne unique). */
function one(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.length > 0 ? v : undefined;
}

export default async function TicketsListPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { key } = await params;
  const sp = await searchParams;

  const project = await getProjectByKey(key);
  if (!project) notFound();

  const q = one(sp.q);
  const assigneeId = one(sp.assigneeId);
  const labelId = one(sp.labelId);
  const sprintId = one(sp.sprintId);
  const typeId = one(sp.typeId);
  const priorityId = one(sp.priorityId);
  const page = Math.max(1, Number(one(sp.page)) || 1);

  const [list, sprints, labels, members, types, priorities] = await Promise.all([
    getTicketsList(project.id, {
      q,
      assigneeId,
      labelId,
      sprintId,
      typeId,
      priorityId,
      page,
    }),
    getSprints(project.id),
    getLabels(project.id),
    getMembers(),
    getTicketTypes(project.id),
    getTicketPriorities(project.id),
  ]);

  const totalPages = Math.max(1, Math.ceil(list.total / list.pageSize));
  const hasFilters = Boolean(
    q || assigneeId || labelId || sprintId || typeId || priorityId,
  );

  // Conserve les filtres actifs dans les liens de pagination.
  const carry: Record<string, string | undefined> = {
    q,
    assigneeId,
    labelId,
    sprintId,
    typeId,
    priorityId,
  };
  function pageHref(target: number): string {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(carry)) if (v) params.set(k, v);
    if (target > 1) params.set("page", String(target));
    const qs = params.toString();
    return qs
      ? `/projects/${key}/tickets?${qs}`
      : `/projects/${key}/tickets`;
  }

  const from = list.total === 0 ? 0 : (list.page - 1) * list.pageSize + 1;
  const to = Math.min(list.total, list.page * list.pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
        <CreateTicketDialog
          projectId={project.id}
          members={members}
          sprints={sprints}
          labels={labels}
          types={types}
          priorities={priorities}
        />
      </div>

      <TicketFilters
        members={members}
        sprints={sprints}
        labels={labels}
        types={types}
        priorities={priorities}
      />

      <TicketTable
        items={list.items}
        projectKey={project.key}
        sprints={sprints}
        hasFilters={hasFilters}
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {list.total > 0
            ? `${from}–${to} sur ${list.total} ticket${list.total > 1 ? "s" : ""}`
            : "Aucun ticket"}
        </p>
        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <Button
              asChild={list.page > 1}
              variant="outline"
              size="sm"
              disabled={list.page <= 1}
            >
              {list.page > 1 ? (
                <Link href={pageHref(list.page - 1)}>Précédent</Link>
              ) : (
                <span>Précédent</span>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {list.page} / {totalPages}
            </span>
            <Button
              asChild={list.page < totalPages}
              variant="outline"
              size="sm"
              disabled={list.page >= totalPages}
            >
              {list.page < totalPages ? (
                <Link href={pageHref(list.page + 1)}>Suivant</Link>
              ) : (
                <span>Suivant</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
