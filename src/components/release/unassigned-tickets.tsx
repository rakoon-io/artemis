"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, PackagePlus, Loader2 } from "lucide-react";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { canEditTicket, type PolicyUser } from "@/lib/policies";
import { useDict } from "@/i18n/provider";

/**
 * CE QUI N'EST PRÉVU DANS AUCUNE LIVRAISON.
 *
 * La page ne montrait que ce qui était déjà rangé - donc jamais ce qu'il restait
 * à ranger. On voyait des versions se remplir sans jamais savoir dans quoi l'on
 * puisait, ni combien il restait. C'est la même colonne que le backlog des
 * sprints, et la même question posée sur l'autre axe : le sprint dit QUAND on
 * travaille, la version dit CE QU'ON LIVRE.
 */

/** Ticket sans version, réduit à ce que la colonne affiche. */
export interface UnassignedTicketRow {
  id: string;
  key: string;
  title: string;
  reporterId: string;
  assigneeId: string | null;
  column: { name: string; order: number };
  type: { name: string; color: string };
  priority: { name: string; color: string };
}

/** Version proposée au rattachement. */
export interface ReleaseChoice {
  id: string;
  name: string;
}

export function UnassignedTickets({
  tickets,
  releases,
  projectKey,
  currentUser,
  lastColumnOrder,
}: {
  tickets: UnassignedTicketRow[];
  releases: ReleaseChoice[];
  projectKey: string;
  currentUser: PolicyUser | null;
  lastColumnOrder: number;
}) {
  const t = useDict();

  if (tickets.length === 0) {
    return (
      <p className="rounded-md border border-dashed px-3 py-4 text-sm text-muted-foreground">
        {t.releases.unassignedEmpty}
      </p>
    );
  }

  return (
    <ul className="slim-scrollbar max-h-[calc(100dvh-16rem)] divide-y overflow-y-auto rounded-lg border">
      {tickets.map((ticket) => (
        <li
          key={ticket.id}
          className="flex items-center gap-2 px-2 py-1.5 text-sm"
        >
          <Link
            href={`/projects/${projectKey}/tickets/${ticket.id}`}
            className="flex min-w-0 flex-1 items-center gap-2 transition-colors hover:text-primary"
          >
            <span className="w-16 shrink-0 truncate font-mono text-xs text-muted-foreground">
              {ticket.key}
            </span>
            <span
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: ticket.type.color }}
              title={ticket.type.name}
              aria-hidden
            />
            <span className="flex-1 truncate">{ticket.title}</span>
          </Link>
          <span className="hidden shrink-0 items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: ticket.priority.color }}
              aria-hidden
            />
            {ticket.priority.name}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "hidden shrink-0 font-normal sm:inline-flex",
              ticket.column.order >= lastColumnOrder &&
                "border-emerald-500/40 text-emerald-700 dark:text-emerald-300",
            )}
          >
            {ticket.column.name}
          </Badge>
          {/* Le bouton n'apparaît qu'à qui peut réellement rattacher le ticket :
              le serveur refuserait les autres. */}
          {canEditTicket(currentUser, ticket) && (
            <AssignMenu ticketId={ticket.id} releases={releases} />
          )}
        </li>
      ))}
    </ul>
  );
}

/**
 * Rattacher un ticket à une version, depuis la liste.
 *
 * Un menu et non un champ de sélection : on rattache d'un geste, ligne après
 * ligne, en descendant la colonne. Il n'y a pas d'entrée « aucune version » -
 * ces tickets n'en ont déjà pas ; on les détache depuis la carte de la version
 * ou depuis la fiche du ticket.
 */
function AssignMenu({
  ticketId,
  releases,
}: {
  ticketId: string;
  releases: ReleaseChoice[];
}) {
  const t = useDict();
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function assign(releaseId: string) {
    setPending(true);
    const res = await updateTicketAction({ id: ticketId, releaseId });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.releases.ticketAssigned);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          disabled={pending}
          title={t.releases.assignAria}
          aria-label={t.releases.assignAria}
        >
          {pending ? (
            <Loader2 className="animate-spin" />
          ) : (
            <PackagePlus className="size-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>{t.releases.assignTo}</DropdownMenuLabel>
        {releases.length === 0 ? (
          <DropdownMenuItem disabled>
            {t.releases.noReleaseCreateOne}
          </DropdownMenuItem>
        ) : (
          releases.map((release) => (
            <DropdownMenuItem
              key={release.id}
              onSelect={() => void assign(release.id)}
            >
              <Check className="opacity-0" aria-hidden />
              {release.name}
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
