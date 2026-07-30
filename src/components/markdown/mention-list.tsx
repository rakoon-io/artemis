"use client";

import { cn } from "@/lib/utils";
import type { TicketRef } from "@/lib/wiki-mentions";

/**
 * Liste des tickets proposés pendant la frappe d'une mention « @ ».
 *
 * Purement présentationnelle, et PARTAGÉE par les deux modes de saisie : le
 * Markdown brut, où la mention se lit dans un `textarea`, et la mise en forme,
 * où elle se lit dans le document ProseMirror. Les deux détectent et classent
 * par le même module (`@/lib/wiki-mentions`) ; il aurait été absurde qu'ils
 * n'affichent pas la même liste.
 *
 * Le positionnement est laissé à l'appelant : lui seul sait où se trouve le
 * curseur dans sa propre surface.
 */
export const MENTION_LIST_WIDTH = 288;

export function MentionList({
  results,
  activeIndex,
  label,
  style,
  onPick,
}: {
  results: TicketRef[];
  activeIndex: number;
  label: string;
  style?: React.CSSProperties;
  onPick: (ticket: TicketRef) => void;
}) {
  if (results.length === 0) return null;
  return (
    <div
      className="absolute z-20 max-h-56 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={style}
    >
      <p className="px-2 py-1 text-xs text-muted-foreground">{label}</p>
      {results.map((ticket, i) => (
        <button
          key={ticket.id}
          type="button"
          // `onMouseDown` prévenu : sans cela, le clic retire le focus de la
          // zone de saisie avant l'insertion, et l'on écrirait dans le vide.
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(ticket);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
            i === activeIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
        >
          <span className="shrink-0 font-mono text-xs text-muted-foreground">
            {ticket.key}
          </span>
          <span className="truncate">{ticket.title}</span>
        </button>
      ))}
    </div>
  );
}
