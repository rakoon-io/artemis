"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GripVertical } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Role } from "@prisma/client";

import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn, initials } from "@/lib/utils";
import { ColorBadge } from "@/components/ticket/ticket-fields";
import type { BoardTicket, CurrentUser } from "./kanban-board";

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
            <ColorBadge
              name={ticket.priority.name}
              color={ticket.priority.color}
            />
          </div>

          <Link
            href={`/projects/${projectKey}/tickets/${ticket.id}`}
            className="mt-1.5 block rounded-sm text-sm font-medium leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="line-clamp-3">{ticket.title}</span>
          </Link>

          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <ColorBadge name={ticket.type.name} color={ticket.type.color} />
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
