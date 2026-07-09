"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Priority, Role, TicketType } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, initials } from "@/lib/utils";
import type { BoardTicket, CurrentUser } from "./kanban-board";

/** Libellés + couleurs distinctes par type de ticket (réutilisés par les filtres). */
export const TYPE_META: Record<TicketType, { label: string; className: string }> = {
  [TicketType.BUG]: {
    label: "Bug",
    className:
      "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
  },
  [TicketType.FEATURE]: {
    label: "Fonctionnalité",
    className:
      "border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-900 dark:bg-violet-950 dark:text-violet-300",
  },
  [TicketType.TASK]: {
    label: "Tâche",
    className:
      "border-sky-300 bg-sky-50 text-sky-700 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-300",
  },
  [TicketType.CHORE]: {
    label: "Corvée",
    className:
      "border-zinc-300 bg-zinc-50 text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300",
  },
};

/** Libellés + couleurs distinctes par priorité (réutilisés par les filtres). */
export const PRIORITY_META: Record<
  Priority,
  { label: string; className: string; dot: string }
> = {
  [Priority.LOW]: {
    label: "Basse",
    className: "border-zinc-300 text-zinc-600 dark:border-zinc-700 dark:text-zinc-300",
    dot: "bg-zinc-400",
  },
  [Priority.MEDIUM]: {
    label: "Moyenne",
    className: "border-sky-300 text-sky-700 dark:border-sky-900 dark:text-sky-300",
    dot: "bg-sky-500",
  },
  [Priority.HIGH]: {
    label: "Haute",
    className: "border-amber-400 text-amber-700 dark:border-amber-900 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  [Priority.URGENT]: {
    label: "Urgente",
    className: "border-red-400 text-red-700 dark:border-red-900 dark:text-red-300",
    dot: "bg-red-500",
  },
};

/** Un utilisateur peut déplacer un ticket s'il est Admin, rapporteur ou assigné. */
export function canDragTicket(user: CurrentUser, ticket: BoardTicket): boolean {
  return (
    user.role === Role.ADMIN ||
    ticket.reporterId === user.id ||
    ticket.assigneeId === user.id
  );
}

/**
 * Rendu visuel pur d'une carte (sans logique dnd) — partagé par la carte
 * triable et le `DragOverlay`. `handle` = poignée de déplacement (ou statique).
 */
export function TicketCardView({
  ticket,
  projectKey,
  handle,
  overlay = false,
}: {
  ticket: BoardTicket;
  projectKey: string;
  handle?: ReactNode;
  overlay?: boolean;
}) {
  const type = TYPE_META[ticket.type];
  const priority = PRIORITY_META[ticket.priority];
  const assigneeName = ticket.assignee?.name ?? ticket.assignee?.email ?? null;
  const extraLabels = ticket.labels.length - 4;

  return (
    <Card
      className={cn(
        "gap-0 p-2.5",
        overlay && "rotate-1 shadow-lg ring-2 ring-ring",
      )}
    >
      <div className="flex items-start gap-1.5">
        {handle}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs text-muted-foreground">
              {ticket.key}
            </span>
            <Badge variant="outline" className={cn("gap-1", priority.className)}>
              <span className={cn("size-1.5 rounded-full", priority.dot)} />
              {priority.label}
            </Badge>
          </div>

          <Link
            href={`/projects/${projectKey}/tickets/${ticket.id}`}
            className="mt-1.5 block rounded-sm text-sm font-medium leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="line-clamp-3">{ticket.title}</span>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge variant="outline" className={type.className}>
              {type.label}
            </Badge>
          </div>

          {(ticket.labels.length > 0 || assigneeName) && (
            <div className="mt-2 flex items-end justify-between gap-2">
              <div className="flex min-w-0 flex-wrap gap-1">
                {ticket.labels.slice(0, 4).map(({ label }) => (
                  <span
                    key={label.id}
                    className="inline-flex max-w-[8rem] items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] text-muted-foreground"
                  >
                    <span
                      className="size-2 shrink-0 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="truncate">{label.name}</span>
                  </span>
                ))}
                {extraLabels > 0 && (
                  <span className="text-[10px] text-muted-foreground">
                    +{extraLabels}
                  </span>
                )}
              </div>

              {assigneeName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Avatar className="size-6 shrink-0">
                      <AvatarFallback className="text-[10px]">
                        {initials(assigneeName)}
                      </AvatarFallback>
                    </Avatar>
                  </TooltipTrigger>
                  <TooltipContent>{assigneeName}</TooltipContent>
                </Tooltip>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

/**
 * Carte triable (dnd-kit). Le déplacement est désactivé si l'utilisateur n'a pas
 * le droit (l'UI masque ; le serveur impose de toute façon via `canMoveTicket`).
 * La poignée porte les écouteurs clavier/souris pour ne pas gêner le lien titre.
 */
export function TicketCard({
  ticket,
  projectKey,
  currentUser,
}: {
  ticket: BoardTicket;
  projectKey: string;
  currentUser: CurrentUser;
}) {
  const draggable = canDragTicket(currentUser, ticket);
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: ticket.id, disabled: !draggable });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn("touch-none", isDragging && "opacity-40")}
    >
      <TicketCardView
        ticket={ticket}
        projectKey={projectKey}
        handle={
          draggable ? (
            <button
              type="button"
              aria-label={`Déplacer le ticket ${ticket.key} : ${ticket.title}`}
              className="mt-0.5 shrink-0 cursor-grab touch-none rounded-sm text-muted-foreground/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:cursor-grabbing"
              {...attributes}
              {...listeners}
            >
              <GripVertical className="size-4" />
            </button>
          ) : (
            <span className="mt-0.5 w-0 shrink-0" aria-hidden />
          )
        }
      />
    </div>
  );
}
