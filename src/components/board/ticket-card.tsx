"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { GripVertical, UserPlus } from "lucide-react";
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
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import {
  ColorBadge,
  ComponentBadge,
  ModuleBadge,
} from "@/components/ticket/ticket-fields";
import { effectiveModule } from "@/lib/effective-module";
import {
  TicketAssigneeInline,
  TicketPriorityInline,
  TicketTypeInline,
  type AssignableMember,
} from "@/components/ticket/ticket-inline-fields";
import type {
  PriorityOption,
  TicketTypeOption,
} from "@/components/ticket/ticket-fields";
import type { BoardTicket, CurrentUser } from "./kanban-board";

/**
 * CE QU'ON PEUT CHANGER SANS OUVRIR LA CARTE : le type, la priorité, l'assigné.
 *
 * C'est le geste de tri, celui qu'on répète en passant en revue une colonne. Le
 * composant, le module et les labels restent à la liste ou à la fiche : ce sont
 * des rangements, ils demandent de la place, et l'éditeur de labels se déplie -
 * il ferait éclater une carte large de deux cents pixels.
 *
 * Le statut ne figure pas non plus : sur un tableau, c'est la COLONNE, et on la
 * change en faisant glisser.
 */
export interface CardOptions {
  types: TicketTypeOption[];
  priorities: PriorityOption[];
  members: AssignableMember[];
}

/** Un utilisateur peut déplacer un ticket s'il est Admin, rapporteur ou assigné. */
export function canDragTicket(user: CurrentUser, ticket: BoardTicket): boolean {
  return (
    user.role === Role.ADMIN ||
    ticket.reporterId === user.id ||
    ticket.assigneeId === user.id
  );
}

/**
 * Rendu visuel pur d'une carte (sans logique dnd) - partagé par la carte
 * triable et le `DragOverlay`. `handle` = poignée de déplacement (ou statique).
 */
export function TicketCardView({
  ticket,
  projectKey,
  handle,
  overlay = false,
  options,
  canEdit = false,
}: {
  ticket: BoardTicket;
  projectKey: string;
  handle?: ReactNode;
  overlay?: boolean;
  /** Absentes pendant le glissement : la carte fantôme ne se modifie pas. */
  options?: CardOptions;
  canEdit?: boolean;
}) {
  const t = useDict();
  const ticketModule = effectiveModule(ticket);
  const assigneeName = ticket.assignee?.name ?? ticket.assignee?.email ?? null;

  return (
    <Card
      /* COMPACTE et peu arrondie : une colonne n'en montrait que trois. Le
         rayon par défaut - celui des cartes de contenu - donnait à une vignette
         de deux cents pixels l'allure d'un panneau. */
      className={cn(
        "group/card gap-0 rounded-md p-2",
        overlay && "rotate-1 shadow-lg ring-2 ring-ring",
      )}
    >
      <div className="flex items-start gap-1">
        {handle}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="shrink-0 whitespace-nowrap font-mono text-xs text-muted-foreground">
              {ticket.key}
            </span>
            {options ? (
              <TicketPriorityInline
                ticketId={ticket.id}
                value={ticket.priorityId}
                priorities={options.priorities}
                canEdit={canEdit}
                compact
              >
                <ColorBadge
                  name={ticket.priority.name}
                  color={ticket.priority.color}
                  dense
                />
              </TicketPriorityInline>
            ) : (
              <ColorBadge
                name={ticket.priority.name}
                color={ticket.priority.color}
                dense
              />
            )}
          </div>

          <Link
            href={`/projects/${projectKey}/tickets/${ticket.id}`}
            className="block rounded-sm text-[13px] font-medium leading-snug hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="line-clamp-2">{ticket.title}</span>
          </Link>

          {/* Une SEULE rangée pour tout ce qui qualifie le ticket : type,
              rattachement, labels, assigné. Elles étaient deux, et la carte
              gagnait vingt pixels de hauteur pour montrer les mêmes choses. */}
          <div className="flex flex-wrap items-center gap-1">
            {options ? (
              <TicketTypeInline
                ticketId={ticket.id}
                value={ticket.typeId}
                types={options.types}
                canEdit={canEdit}
                compact
              >
                <ColorBadge
                  name={ticket.type.name}
                  color={ticket.type.color}
                  dense
                />
              </TicketTypeInline>
            ) : (
              <ColorBadge name={ticket.type.name} color={ticket.type.color} dense />
            )}
            {/* Composant concerné : situe la demande dans le produit. */}
            {ticket.component && (
              <ComponentBadge
                name={ticket.component.name}
                kind={ticket.component.kind}
                color={ticket.component.color}
                kindLabel={t.taxonomy.componentKinds[ticket.component.kind]}
                dense
              />
            )}
            {/* Module affiché UNIQUEMENT à défaut de composant : quand il y en a
                un, il porte déjà son module, et empiler les deux alourdirait la
                carte. Sans cela, un ticket contextualisé au seul niveau du
                module paraîtrait dépourvu de tout rattachement sur le tableau. */}
            {!ticket.component && ticketModule && (
              <ModuleBadge
                name={ticketModule.name}
                color={ticketModule.color}
                dense
              />
            )}
            {/* LABELS EN PASTILLES, sans leur nom : écrits en toutes lettres, ils
                faisaient passer la rangée sur deux lignes, soit une carte de moins
                par colonne. La couleur suffit à reconnaître ce qu'on a soi-même
                posé ; le nom reste au survol, et en toutes lettres dans la liste
                et sur la fiche. */}
            {ticket.labels.length > 0 && (
              /* Les pastilles occupent la MÊME hauteur que les cartouches :
                 alignées sur leur ligne médiane, elles ne creusent plus la
                 rangée. */
              <span className="flex h-6 items-center gap-1">
                {ticket.labels.map(({ label }) => (
                  <Tooltip key={label.id}>
                    <TooltipTrigger asChild>
                      <span
                        className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                        style={{ backgroundColor: label.color }}
                      />
                    </TooltipTrigger>
                    <TooltipContent>{label.name}</TooltipContent>
                  </Tooltip>
                ))}
              </span>
            )}

            {/* L'assigné FERME la rangée, poussé à droite : c'est le repère
                qu'on cherche en balayant une colonne du regard. */}
            <span className="ml-auto shrink-0">
              {options ? (
                <TicketAssigneeInline
                  ticketId={ticket.id}
                  value={ticket.assigneeId}
                  members={options.members}
                  canEdit={canEdit}
                  compact
                >
                  {assigneeName ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Avatar className="size-5 shrink-0">
                          <AvatarFallback className="text-[10px]">
                            {initials(assigneeName)}
                          </AvatarFallback>
                        </Avatar>
                      </TooltipTrigger>
                      <TooltipContent>{assigneeName}</TooltipContent>
                    </Tooltip>
                  ) : (
                    /* PLACE VIDE : sans elle, une carte non assignée n'offrait
                         rien à cliquer. Elle ne paraît qu'au survol de la carte -
                         et toujours au doigt, où il n'y a pas de survol - pour ne
                         pas constellez le tableau de pastilles grises. */
                    <span
                      className="flex size-5 shrink-0 items-center justify-center rounded-full border border-dashed text-muted-foreground opacity-0 transition-opacity group-hover/card:opacity-100 pointer-coarse:opacity-100"
                      aria-hidden
                    >
                      <UserPlus className="size-3" />
                    </span>
                  )}
                </TicketAssigneeInline>
              ) : (
                assigneeName && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Avatar className="size-5 shrink-0">
                        <AvatarFallback className="text-[10px]">
                          {initials(assigneeName)}
                        </AvatarFallback>
                      </Avatar>
                    </TooltipTrigger>
                    <TooltipContent>{assigneeName}</TooltipContent>
                  </Tooltip>
                )
              )}
            </span>
          </div>
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
  options,
}: {
  ticket: BoardTicket;
  projectKey: string;
  currentUser: CurrentUser;
  options: CardOptions;
}) {
  const t = useDict();
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
        options={options}
        /* Mêmes droits que le déplacement : administrateur, rapporteur ou
           assigné (`canEditTicket`). */
        canEdit={draggable}
        handle={
          draggable ? (
            <button
              type="button"
              aria-label={fmt(t.board.dragTicketLabel, {
                key: ticket.key,
                title: ticket.title,
              })}
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
