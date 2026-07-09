"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChevronDown, X } from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { Priority, type Role, TicketType } from "@prisma/client";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TooltipProvider } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { rankBetween } from "@/lib/rank";
import { moveTicketAction } from "@/server/actions/board.actions";
import { createTicketAction } from "@/server/actions/ticket.actions";
import type { getBoardData } from "@/server/queries";
import { BoardColumn } from "./board-column";
import { PRIORITY_META, TYPE_META, TicketCardView } from "./ticket-card";

// ─── Types dérivés du retour serveur (aucun `any`) ─────────────────────────────
type BoardData = Awaited<ReturnType<typeof getBoardData>>;
export type BoardColumnData = BoardData["columns"][number];
export type BoardTicket = BoardColumnData["tickets"][number];
export type CurrentUser = { id: string; role: Role };

type Member = { id: string; name: string | null; email: string };

type Filters = {
  assigneeId?: string;
  type?: TicketType;
  priority?: Priority;
  labelId?: string;
};

const UNASSIGNED = "__unassigned__";
const TYPE_ORDER: TicketType[] = [
  TicketType.BUG,
  TicketType.FEATURE,
  TicketType.TASK,
  TicketType.CHORE,
];
const PRIORITY_ORDER: Priority[] = [
  Priority.URGENT,
  Priority.HIGH,
  Priority.MEDIUM,
  Priority.LOW,
];

function makeMatcher(filters: Filters) {
  return (ticket: BoardTicket): boolean => {
    if (filters.assigneeId) {
      if (filters.assigneeId === UNASSIGNED) {
        if (ticket.assigneeId != null) return false;
      } else if (ticket.assigneeId !== filters.assigneeId) {
        return false;
      }
    }
    if (filters.type && ticket.type !== filters.type) return false;
    if (filters.priority && ticket.priority !== filters.priority) return false;
    if (filters.labelId && !ticket.labels.some((l) => l.labelId === filters.labelId)) {
      return false;
    }
    return true;
  };
}

function arraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function byRank(a: BoardTicket, b: BoardTicket): number {
  if (a.rank < b.rank) return -1;
  if (a.rank > b.rank) return 1;
  return 0;
}

export function KanbanBoard({
  columns: initialColumns,
  projectId,
  projectKey,
  currentUser,
  members,
  className,
}: {
  columns: BoardColumnData[];
  projectId: string;
  projectKey: string;
  currentUser: CurrentUser;
  members: Member[];
  className?: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [columns, setColumns] = useState<BoardColumnData[]>(initialColumns);
  const [syncedColumns, setSyncedColumns] = useState(initialColumns);
  const [filters, setFilters] = useState<Filters>({});
  const [activeId, setActiveId] = useState<string | null>(null);

  // Après une action serveur (`router.refresh()`), remplace l'état optimiste par
  // la vérité canonique renvoyée en props (ajustement d'état pendant le rendu,
  // pattern recommandé plutôt qu'un effet — cf. « You Might Not Need an Effect »).
  if (initialColumns !== syncedColumns) {
    setSyncedColumns(initialColumns);
    setColumns(initialColumns);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const ticketsById = useMemo(() => {
    const map = new Map<string, BoardTicket>();
    for (const column of columns) {
      for (const ticket of column.tickets) map.set(ticket.id, ticket);
    }
    return map;
  }, [columns]);

  const match = useMemo(() => makeMatcher(filters), [filters]);

  const labelOptions = useMemo(() => {
    const map = new Map<string, { value: string; label: string; color: string }>();
    for (const column of columns) {
      for (const ticket of column.tickets) {
        for (const { label } of ticket.labels) {
          if (!map.has(label.id)) {
            map.set(label.id, { value: label.id, label: label.name, color: label.color });
          }
        }
      }
    }
    return [...map.values()];
  }, [columns]);

  const assigneeOptions = useMemo(
    () => [
      { value: UNASSIGNED, label: "Non assigné" },
      ...members.map((m) => ({ value: m.id, label: m.name ?? m.email })),
    ],
    [members],
  );

  const hasFilters =
    !!filters.assigneeId || !!filters.type || !!filters.priority || !!filters.labelId;

  const announcements: Announcements = useMemo(() => {
    const label = (id: string | number) => {
      const ticket = ticketsById.get(String(id));
      return ticket ? `${ticket.key} ${ticket.title}` : "ticket";
    };
    return {
      onDragStart: ({ active }) => `Déplacement du ticket ${label(active.id)} commencé.`,
      onDragOver: ({ active, over }) =>
        over
          ? `Le ticket ${label(active.id)} est au-dessus de ${label(over.id)}.`
          : `Le ticket ${label(active.id)} n'est au-dessus d'aucune cible.`,
      onDragEnd: ({ active, over }) =>
        over
          ? `Le ticket ${label(active.id)} a été déposé sur ${label(over.id)}.`
          : `Le ticket ${label(active.id)} a été relâché.`,
      onDragCancel: ({ active }) =>
        `Déplacement du ticket ${label(active.id)} annulé.`,
    };
  }, [ticketsById]);

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  async function persistMove(
    ticketId: string,
    columnId: string,
    afterRank: string | undefined,
    beforeRank: string | undefined,
    snapshot: BoardColumnData[],
  ) {
    try {
      const result = await moveTicketAction({
        ticketId,
        columnId,
        afterRank: afterRank ?? null,
        beforeRank: beforeRank ?? null,
      });
      if (!result.ok) {
        setColumns(snapshot);
        toast.error(result.error);
        return;
      }
      toast.success("Ticket déplacé.");
      startTransition(() => router.refresh());
    } catch {
      setColumns(snapshot);
      toast.error("Le déplacement du ticket a échoué.");
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);
    if (!over) return;

    const activeTicketId = String(active.id);
    const overId = String(over.id);

    const sourceColumn = columns.find((c) =>
      c.tickets.some((t) => t.id === activeTicketId),
    );
    if (!sourceColumn) return;

    const destColumn =
      columns.find((c) => c.id === overId) ??
      columns.find((c) => c.tickets.some((t) => t.id === overId));
    if (!destColumn) return;

    // Voisins calculés sur la liste *visible* (filtrée) de la colonne cible :
    // « ce que l'on voit est ce que l'on réordonne ».
    const visible = destColumn.tickets.filter(match);
    let aboveRank: string | undefined;
    let belowRank: string | undefined;

    if (sourceColumn.id === destColumn.id) {
      const ids = visible.map((t) => t.id); // inclut la carte déplacée
      const oldIndex = ids.indexOf(activeTicketId);
      const newIndex = overId === destColumn.id ? ids.length - 1 : ids.indexOf(overId);
      if (oldIndex < 0 || newIndex < 0) return;
      const nextIds = arrayMove(ids, oldIndex, newIndex);
      if (arraysEqual(ids, nextIds)) return; // position inchangée → no-op
      const pos = nextIds.indexOf(activeTicketId);
      aboveRank = pos > 0 ? ticketsById.get(nextIds[pos - 1])?.rank : undefined;
      belowRank =
        pos < nextIds.length - 1 ? ticketsById.get(nextIds[pos + 1])?.rank : undefined;
    } else {
      const ids = visible.map((t) => t.id); // exclut la carte déplacée
      const overIndex = ids.indexOf(overId);
      const insertIndex = overId === destColumn.id || overIndex < 0 ? ids.length : overIndex;
      aboveRank = insertIndex > 0 ? ticketsById.get(ids[insertIndex - 1])?.rank : undefined;
      belowRank =
        insertIndex < ids.length ? ticketsById.get(ids[insertIndex])?.rank : undefined;
    }

    const activeTicket = ticketsById.get(activeTicketId);
    if (!activeTicket) return;

    const snapshot = columns;
    const newRank = rankBetween(aboveRank ?? null, belowRank ?? null);
    const nextColumns = columns.map((column) => {
      const kept = column.tickets.filter((t) => t.id !== activeTicketId);
      if (column.id !== destColumn.id) return { ...column, tickets: kept };
      const moved: BoardTicket = { ...activeTicket, columnId: destColumn.id, rank: newRank };
      return { ...column, tickets: [...kept, moved].sort(byRank) };
    });

    setColumns(nextColumns);
    void persistMove(activeTicketId, destColumn.id, aboveRank, belowRank, snapshot);
  }

  async function handleQuickAdd(title: string): Promise<boolean> {
    const result = await createTicketAction({ projectId, title });
    if (!result.ok) {
      toast.error(result.error);
      return false;
    }
    toast.success(`Ticket ${result.data?.key ?? ""} créé.`.trim());
    startTransition(() => router.refresh());
    return true;
  }

  const activeTicket = activeId ? ticketsById.get(activeId) : undefined;

  return (
    <TooltipProvider>
      <div className={cn("flex min-h-0 flex-1 flex-col gap-3 p-4 md:p-6", className)}>
        {/* Barre de filtres */}
        <div className="flex flex-wrap items-center gap-2">
          <FilterMenu
            label="Assigné"
            value={filters.assigneeId}
            options={assigneeOptions}
            onChange={(value) => setFilters((f) => ({ ...f, assigneeId: value }))}
          />
          <FilterMenu<TicketType>
            label="Type"
            value={filters.type}
            options={TYPE_ORDER.map((t) => ({ value: t, label: TYPE_META[t].label }))}
            onChange={(value) => setFilters((f) => ({ ...f, type: value }))}
          />
          <FilterMenu<Priority>
            label="Priorité"
            value={filters.priority}
            options={PRIORITY_ORDER.map((p) => ({
              value: p,
              label: PRIORITY_META[p].label,
            }))}
            onChange={(value) => setFilters((f) => ({ ...f, priority: value }))}
          />
          <FilterMenu
            label="Label"
            value={filters.labelId}
            options={labelOptions}
            onChange={(value) => setFilters((f) => ({ ...f, labelId: value }))}
          />
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({})}>
              <X />
              Réinitialiser
            </Button>
          )}
        </div>

        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          accessibility={{ announcements }}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setActiveId(null)}
        >
          <div className="flex min-h-0 flex-1 gap-4 overflow-x-auto pb-2">
            {columns.map((column, index) => (
              <BoardColumn
                key={column.id}
                column={column}
                tickets={column.tickets.filter(match)}
                totalCount={column.tickets.length}
                projectKey={projectKey}
                currentUser={currentUser}
                onQuickAdd={index === 0 ? handleQuickAdd : undefined}
              />
            ))}
          </div>

          <DragOverlay>
            {activeTicket ? (
              <TicketCardView ticket={activeTicket} projectKey={projectKey} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </TooltipProvider>
  );
}

/** Menu de filtre à choix unique (avec option « Tous »). */
function FilterMenu<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value?: T;
  options: { value: T; label: string; color?: string }[];
  onChange: (value?: T) => void;
}) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(value && "border-primary/60 text-primary")}
        >
          {label}
          {current ? ` : ${current.label}` : ""}
          <ChevronDown className="opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-h-72 overflow-y-auto">
        <DropdownMenuCheckboxItem
          checked={!value}
          onCheckedChange={() => onChange(undefined)}
        >
          Tous
        </DropdownMenuCheckboxItem>
        {options.length > 0 && <DropdownMenuSeparator />}
        {options.map((option) => (
          <DropdownMenuCheckboxItem
            key={option.value}
            checked={value === option.value}
            onCheckedChange={() => onChange(option.value)}
          >
            <span className="flex items-center gap-2">
              {option.color && (
                <span
                  className="size-2 rounded-full"
                  style={{ backgroundColor: option.color }}
                />
              )}
              {option.label}
            </span>
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
