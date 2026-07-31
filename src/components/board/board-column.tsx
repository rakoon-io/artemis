"use client";

import { useState } from "react";
import { ChevronRight, Plus } from "lucide-react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import { TicketCard, type CardOptions } from "./ticket-card";
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
  cardOptions,
  activeSprintId,
  onQuickAdd,
}: {
  column: BoardColumnData;
  /** Tickets à afficher (déjà filtrés). */
  tickets: BoardTicket[];
  /** Nombre total de tickets de la colonne (hors filtres) pour la limite WIP. */
  totalCount: number;
  projectKey: string;
  currentUser: CurrentUser;
  /** Listes de choix des champs modifiables sur une carte. */
  cardOptions: CardOptions;
  /**
   * Sprint en cours. Fourni à la DERNIÈRE colonne seulement - celle des tickets
   * achevés -, il y sépare le récent de l'ancien. Absent (pas de sprint actif,
   * ou colonne quelconque), la colonne s'affiche d'un seul tenant.
   */
  activeSprintId?: string | null;
  /** Fourni uniquement pour la 1re colonne (ajout rapide). */
  onQuickAdd?: (title: string) => Promise<boolean>;
}) {
  const t = useDict();
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  const overLimit = column.wipLimit != null && totalCount > column.wipLimit;

  /**
   * ACHEVÉS RÉCENTS / PLUS ANCIENS.
   *
   * La colonne de fin ne se vide jamais : au bout de trois sprints, ce qu'on a
   * terminé cette semaine est enseveli sous des mois de travail livré. Le
   * partage se fait sur le SPRINT EN COURS - ce qui vient d'être achevé est ce
   * qui appartient à l'itération courante -, et non sur une date arbitraire.
   *
   * Le repli n'existe QUE s'il a un sens : sans sprint actif, la notion de
   * « récent » n'est définie par rien, et la colonne reste entière.
   */
  const recent = activeSprintId
    ? tickets.filter((ticket) => ticket.sprintId === activeSprintId)
    : tickets;
  const older = activeSprintId
    ? tickets.filter((ticket) => ticket.sprintId !== activeSprintId)
    : [];
  const [showOlder, setShowOlder] = useState(false);
  const visible = showOlder ? [...recent, ...older] : recent;

  return (
    <section
      aria-label={column.name}
      className="relative flex h-full min-w-[16rem] max-w-[24rem] flex-1 flex-col rounded-xl border bg-muted/30"
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
            title={fmt(t.board.wipLimit, { limit: column.wipLimit })}
            className="shrink-0"
          >
            {totalCount}/{column.wipLimit}
          </Badge>
        )}
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          /* `pb-14` : la place du bouton flottant. Sans elle, il recouvrait le
             coin de la dernière carte - et donc son assigné - dès qu'une colonne
             était pleine. */
          "slim-scrollbar flex-1 space-y-2 overflow-y-auto p-2 pb-14 transition-colors",
          isOver && "bg-accent/50",
        )}
      >
        <SortableContext
          items={visible.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {recent.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              projectKey={projectKey}
              currentUser={currentUser}
              options={cardOptions}
            />
          ))}
          {/* Le pli. Les cartes repliées ne sont pas rendues : elles ne
              participent donc pas au tri tant qu'on ne les a pas montrées. */}
          {older.length > 0 && (
            <button
              type="button"
              onClick={() => setShowOlder((on) => !on)}
              aria-expanded={showOlder}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ChevronRight
                className={cn("size-3.5 transition-transform", showOlder && "rotate-90")}
                aria-hidden
              />
              {fmt(t.board.olderDone, { count: older.length })}
            </button>
          )}
          {showOlder && older.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              projectKey={projectKey}
              currentUser={currentUser}
              options={cardOptions}
            />
          ))}
        </SortableContext>

        {tickets.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
            {t.board.dropHere}
          </div>
        )}
      </div>

      {onQuickAdd && <QuickAdd onSubmit={onQuickAdd} />}
    </section>
  );
}

/** Composeur d'ajout rapide (titre seul) affiché au pied de la 1re colonne. */
function QuickAdd({ onSubmit }: { onSubmit: (title: string) => Promise<boolean> }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);

  function close() {
    setOpen(false);
    setTitle("");
  }

  if (!open) {
    /**
     * BOUTON FLOTTANT plutôt qu'une barre en pied de colonne.
     *
     * La barre occupait quarante-cinq pixels sur toute la largeur, en
     * permanence, pour une action qu'on déclenche une fois de temps en temps -
     * autant de hauteur retirée aux cartes, qui sont la raison d'être de la
     * colonne. Posé au-dessus du contenu, dans le coin, il ne coûte plus rien et
     * reste atteignable sans faire défiler.
     */
    return (
      <Button
        size="sm"
        className="absolute bottom-3 right-3 z-10 h-8 rounded-full px-3 text-xs shadow-lg"
        title={t.board.addTicket}
        onClick={() => setOpen(true)}
      >
        <Plus />
        {t.board.addTicket}
      </Button>
    );
  }

  return (
    <form
      /* Ouvert, le formulaire prend la place du bouton : posé par-dessus le bas
         de la colonne, il n'en réduit pas la hauteur utile. */
      className="absolute inset-x-2 bottom-2 z-10 space-y-2 rounded-lg border bg-popover p-2 shadow-lg"
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
        placeholder={t.board.ticketTitlePlaceholder}
        aria-label={t.board.newTicketTitleLabel}
        disabled={busy}
        onKeyDown={(event) => {
          if (event.key === "Escape") close();
        }}
      />
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={busy || !title.trim()}>
          {t.board.add}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={close}>
          {t.common.cancel}
        </Button>
      </div>
    </form>
  );
}
