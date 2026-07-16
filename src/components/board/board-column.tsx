"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TicketCard } from "./ticket-card";
import type { BoardColumnData, BoardTicket, CurrentUser } from "./kanban-board";

/**
 * Colonne du tableau : zone de dépôt (droppable) + liste triable de cartes.
 * L'en-tête affiche le compteur et, si défini, un badge de limite WIP -
 * signalé visuellement en cas de dépassement mais **non bloquant**.
 */
export function BoardColumn({
  column,
  tickets,
  totalCount,
  projectKey,
  currentUser,
  onQuickAdd,
}: {
  column: BoardColumnData;
  /** Tickets à afficher (déjà filtrés). */
  tickets: BoardTicket[];
  /** Nombre total de tickets de la colonne (hors filtres) pour la limite WIP. */
  totalCount: number;
  projectKey: string;
  currentUser: CurrentUser;
  /** Fourni uniquement pour la 1re colonne (ajout rapide). */
  onQuickAdd?: (title: string) => Promise<boolean>;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overLimit = column.wipLimit != null && totalCount > column.wipLimit;

  return (
    <section
      aria-label={column.name}
      className="flex h-full min-w-[16rem] max-w-[24rem] flex-1 flex-col rounded-xl border bg-muted/30"
    >
      <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-sm font-semibold">{column.name}</h2>
          <Badge variant="secondary" className="shrink-0">
            {totalCount}
          </Badge>
        </div>
        {column.wipLimit != null && (
          <Badge
            variant={overLimit ? "destructive" : "outline"}
            title={`Limite WIP : ${column.wipLimit}`}
            className="shrink-0"
          >
            {totalCount}/{column.wipLimit}
          </Badge>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 space-y-2 overflow-y-auto p-2 transition-colors",
          isOver && "bg-accent/50",
        )}
      >
        <SortableContext
          items={tickets.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              projectKey={projectKey}
              currentUser={currentUser}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            Déposer un ticket ici
          </div>
        )}
      </div>

      {onQuickAdd && <QuickAdd onSubmit={onQuickAdd} />}
    </section>
  );
}

/** Composeur d'ajout rapide (titre seul) affiché au pied de la 1re colonne. */
function QuickAdd({ onSubmit }: { onSubmit: (title: string) => Promise<boolean> }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setTitle("");
  }

  if (!open) {
    return (
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground"
          onClick={() => setOpen(true)}
        >
          <Plus />
          Ajouter un ticket
        </Button>
      </div>
    );
  }

  return (
    <form
      className="space-y-2 border-t p-2"
      onSubmit={async (event) => {
        event.preventDefault();
        const value = title.trim();
        if (!value || busy) return;
        setBusy(true);
        const ok = await onSubmit(value);
        setBusy(false);
        if (ok) close();
      }}
    >
      <Input
        autoFocus
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Titre du ticket"
        aria-label="Titre du nouveau ticket"
        disabled={busy}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          Ajouter
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          Annuler
        </Button>
      </div>
    </form>
  );
}
