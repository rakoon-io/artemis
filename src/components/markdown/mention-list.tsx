"use client";

import { AtSign } from "lucide-react";
import { cn } from "@/lib/utils";
import { userLabel, type MentionTarget } from "@/lib/wiki-mentions";

/**
 * Liste des propositions affichées pendant la frappe d'une mention « @ » :
 * TÂCHES et PERSONNES dans la même liste.
 *
 * Purement présentationnelle, et PARTAGÉE par les deux modes de saisie : le
 * Markdown brut, où la mention se lit dans un `textarea`, et la mise en forme,
 * où elle se lit dans le document ProseMirror. Les deux détectent et classent
 * par le même module (`@/lib/wiki-mentions`) ; il aurait été absurde qu'ils
 * n'affichent pas la même liste.
 *
 * Les deux natures se distinguent à l'œil - clef en chasse fixe pour une tâche,
 * arobase et adresse pour une personne - sans être séparées en deux blocs : le
 * classement les entremêle, et un intertitre par nature romprait cet ordre.
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
  results: MentionTarget[];
  activeIndex: number;
  label: string;
  style?: React.CSSProperties;
  onPick: (target: MentionTarget) => void;
}) {
  if (results.length === 0) return null;
  return (
    <div
      className="absolute z-20 max-h-56 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
      style={style}
    >
      <p className="px-2 py-1 text-xs text-muted-foreground">{label}</p>
      {results.map((target, i) => (
        <button
          key={`${target.kind}-${target.id}`}
          type="button"
          // `onMouseDown` prévenu : sans cela, le clic retire le focus de la
          // zone de saisie avant l'insertion, et l'on écrirait dans le vide.
          onMouseDown={(event) => {
            event.preventDefault();
            onPick(target);
          }}
          className={cn(
            "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
            i === activeIndex
              ? "bg-accent text-accent-foreground"
              : "hover:bg-accent/50",
          )}
        >
          {target.kind === "ticket" ? (
            <>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">
                {target.ticket.key}
              </span>
              <span className="truncate">{target.ticket.title}</span>
            </>
          ) : (
            <>
              <AtSign className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="truncate">{userLabel(target.user)}</span>
              <span className="ml-auto shrink-0 truncate text-xs text-muted-foreground">
                {target.user.email}
              </span>
            </>
          )}
        </button>
      ))}
    </div>
  );
}
