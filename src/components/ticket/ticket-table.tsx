import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn, formatDate, initials } from "@/lib/utils";
import {
  LabelChip,
  PriorityBadge,
  TypeBadge,
  type SprintOption,
  type TicketRow,
} from "./ticket-fields";

/**
 * Vue liste des tickets (tableau). Rendu serveur : purement présentationnel.
 * `sprints` sert à résoudre le nom du sprint (la query liste ne l'inclut pas).
 */
export function TicketTable({
  items,
  projectKey,
  sprints,
  hasFilters,
}: {
  items: TicketRow[];
  projectKey: string;
  sprints: SprintOption[];
  hasFilters: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {hasFilters
            ? "Aucun ticket ne correspond à ces filtres."
            : "Aucun ticket pour le moment."}
        </p>
        {hasFilters && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectKey}/tickets`}>
              Réinitialiser les filtres
            </Link>
          </Button>
        )}
      </div>
    );
  }

  const sprintName = new Map(sprints.map((s) => [s.id, s.name] as const));

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">Clé</th>
            <th scope="col" className="px-3 py-2 font-medium">Titre</th>
            <th scope="col" className="px-3 py-2 font-medium">Type</th>
            <th scope="col" className="px-3 py-2 font-medium">Priorité</th>
            <th scope="col" className="px-3 py-2 font-medium">Statut</th>
            <th scope="col" className="px-3 py-2 font-medium">Assigné</th>
            <th scope="col" className="px-3 py-2 font-medium">Sprint</th>
            <th scope="col" className="px-3 py-2 font-medium">Labels</th>
            <th scope="col" className="px-3 py-2 font-medium">Mis à jour</th>
          </tr>
        </thead>
        <tbody>
          {items.map((ticket) => (
            <tr
              key={ticket.id}
              className={cn("border-b transition-colors last:border-0 hover:bg-muted/40")}
            >
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-muted-foreground">
                {ticket.key}
              </td>
              <td className="px-3 py-2">
                <Link
                  href={`/projects/${projectKey}/tickets/${ticket.id}`}
                  className="font-medium hover:underline"
                >
                  {ticket.title}
                </Link>
              </td>
              <td className="px-3 py-2">
                <TypeBadge type={ticket.type} />
              </td>
              <td className="px-3 py-2">
                <PriorityBadge priority={ticket.priority} />
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {ticket.column.name}
              </td>
              <td className="whitespace-nowrap px-3 py-2">
                {ticket.assignee ? (
                  <span className="flex items-center gap-2">
                    <Avatar className="size-6">
                      <AvatarFallback className="text-[10px]">
                        {initials(ticket.assignee.name ?? ticket.assignee.email)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {ticket.assignee.name ?? ticket.assignee.email}
                    </span>
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {ticket.sprintId
                  ? (sprintName.get(ticket.sprintId) ?? "—")
                  : "—"}
              </td>
              <td className="px-3 py-2">
                {ticket.labels.length > 0 ? (
                  <span className="flex flex-wrap gap-1">
                    {ticket.labels.map((l) => (
                      <LabelChip
                        key={l.labelId}
                        name={l.label.name}
                        color={l.label.color}
                      />
                    ))}
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {formatDate(ticket.updatedAt)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
