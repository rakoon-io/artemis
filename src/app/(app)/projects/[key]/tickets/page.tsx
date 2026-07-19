import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getAssignableUsers,
  getLabels,
  getSprints,
  getTicketPriorities,
  getTicketsList,
  getTicketTypes,
} from "@/server/queries";
import { CreateTicketDialog } from "@/components/ticket/create-ticket-dialog";
import { GenerateTicketsDialog } from "@/components/ticket/generate-tickets-dialog";
import { TicketFilters } from "@/components/ticket/ticket-filters";
import { TicketTable } from "@/components/ticket/ticket-table";
import { isMistralConfigured } from "@/lib/mistral";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

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
  const t = await getDictionary();

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
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
    getAssignableUsers(project.id),
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

  // Bouton « Créer depuis un texte » affiché uniquement si l'intégration IA
  // (Mistral) est configurée côté serveur (la clé n'atteint jamais le client).
  const aiEnabled = isMistralConfigured();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold tracking-tight">{t.tickets.title}</h1>
        <div className="flex flex-wrap items-center gap-2">
          {aiEnabled && (
            <GenerateTicketsDialog
              projectId={project.id}
              types={types}
              priorities={priorities}
            />
          )}
          <CreateTicketDialog
            projectId={project.id}
            members={members}
            sprints={sprints}
            labels={labels}
            types={types}
            priorities={priorities}
          />
        </div>
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
            ? fmt(t.tickets.countSummary, {
                from,
                to,
                total: list.total,
                noun: list.total > 1 ? t.tickets.ticketOther : t.tickets.ticketOne,
              })
            : t.tickets.noTickets}
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
                <Link href={pageHref(list.page - 1)}>{t.tickets.previous}</Link>
              ) : (
                <span>{t.tickets.previous}</span>
              )}
            </Button>
            <span className="text-sm text-muted-foreground">
              {fmt(t.tickets.pageOf, { current: list.page, total: totalPages })}
            </span>
            <Button
              asChild={list.page < totalPages}
              variant="outline"
              size="sm"
              disabled={list.page >= totalPages}
            >
              {list.page < totalPages ? (
                <Link href={pageHref(list.page + 1)}>{t.tickets.next}</Link>
              ) : (
                <span>{t.tickets.next}</span>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
