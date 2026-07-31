import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn, formatDate, formatTime } from "@/lib/utils";
import { getDictionary } from "@/i18n/server";
import type { TicketRow } from "./ticket-fields";
import {
  RowAssignee,
  RowComponent,
  RowLabels,
  RowModule,
  RowPriority,
  RowSprint,
  RowStatus,
  RowType,
  type RowOptions,
} from "./ticket-row-fields";
import { canEditTicket, type PolicyUser } from "@/lib/policies";

/**
 * Vue liste des tickets (tableau). Rendu serveur, mais ses cellules sont
 * MODIFIABLES EN PLACE : chacune délègue à l'enveloppe cliente déjà employée par
 * la fiche du ticket (cf. `./ticket-row-fields`). Une liste sert autant à ranger
 * qu'à lire - assigner, changer un statut ou une priorité ne devrait pas
 * demander d'ouvrir chaque ticket puis de revenir.
 *
 * La colonne « Composant » n'apparaît que si le projet en déclare au moins un
 * (`hasComponents`) : sinon elle n'afficherait qu'une colonne de tirets.
 */
export async function TicketTable({
  items,
  projectKey,
  options,
  user,
  hasComponents,
  hasModules,
  hasFilters,
}: {
  items: TicketRow[];
  projectKey: string;
  /**
   * Listes de choix des cellules modifiables (déjà chargées par la page). Les
   * sprints y figurent : le tableau n'a plus besoin de les recevoir à part, il
   * lisait leur nom dans la même liste.
   */
  options: RowOptions;
  /** Qui regarde : le droit de modifier se décide ticket par ticket. */
  user: PolicyUser;
  hasComponents: boolean;
  hasModules: boolean;
  hasFilters: boolean;
}) {
  const t = await getDictionary();

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed py-16 text-center">
        <p className="text-sm text-muted-foreground">
          {hasFilters ? t.tickets.emptyFiltered : t.tickets.emptyNone}
        </p>
        {hasFilters && (
          <Button asChild variant="outline" size="sm">
            <Link href={`/projects/${projectKey}/tickets`}>
              {t.tickets.resetFilters}
            </Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="border-b bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colKey}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colTitle}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colType}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colPriority}
            </th>
            {hasModules && (
              <th scope="col" className="px-3 py-2 font-medium">
                {t.tickets.colModule}
              </th>
            )}
            {hasComponents && (
              <th scope="col" className="px-3 py-2 font-medium">
                {t.tickets.colComponent}
              </th>
            )}
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colStatus}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colAssignee}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colSprint}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colLabels}
            </th>
            <th scope="col" className="px-3 py-2 font-medium">
              {t.tickets.colUpdated}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((ticket) => {
            const canEdit = canEditTicket(user, ticket);
            return (
              <tr
                key={ticket.id}
                className={cn(
                  "border-b transition-colors last:border-0 hover:bg-muted/40",
                )}
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
                  <RowType
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-3 py-2">
                  <RowPriority
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                {hasModules && (
                  <td className="px-3 py-2">
                    <RowModule
                      ticket={ticket}
                      options={options}
                      canEdit={canEdit}
                    />
                  </td>
                )}
                {hasComponents && (
                  <td className="px-3 py-2">
                    <RowComponent
                      ticket={ticket}
                      options={options}
                      canEdit={canEdit}
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-muted-foreground">
                  <RowStatus
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                <td className="max-w-[10rem] px-3 py-2">
                  <RowAssignee
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <RowSprint
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                <td className="px-3 py-2">
                  <RowLabels
                    ticket={ticket}
                    options={options}
                    canEdit={canEdit}
                  />
                </td>
                {/* Le jour et l'heure EMPILÉS : mis bout à bout, ils élargissaient
                  d'un tiers une colonne que le tableau ne pouvait déjà pas
                  montrer entièrement. */}
                <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                  <div>{formatDate(ticket.updatedAt)}</div>
                  <div className="text-xs">{formatTime(ticket.updatedAt)}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
