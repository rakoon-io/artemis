"use client";

import { useState } from "react";
import { Check, Search, Tag, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { foldForIndex } from "@/lib/search-text";
import type { LabelOption } from "./ticket-fields";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * SÉLECTEUR DE LABELS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ON A CHOISI DOIT SE VOIR
 *
 * Le bouton annonçait « 3 labels sélectionnés » : il fallait ouvrir le menu pour
 * savoir LESQUELS, et le refermer pour continuer. Il montre désormais les labels
 * eux-mêmes, avec leur couleur - c'est-à-dire ce qu'on lira sur le ticket.
 *
 * Au-delà de trois, le reste devient un compte : une pastille de plus ferait
 * déborder le bouton, et trois suffisent à reconnaître une combinaison qu'on
 * vient de poser.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ON CHERCHE, ON NE DÉROULE PAS
 *
 * Une liste de labels grandit sans qu'on y prenne garde. Le champ de recherche
 * replie les accents des DEUX côtés, avec la fonction qui sert déjà à la
 * recherche plein texte : « réglé » se trouve en tapant « regle ».
 *
 * La frappe est retenue avant d'atteindre le menu (`stopPropagation`) : Radix y
 * fait autrement sauter la sélection d'un élément à l'autre au fil des lettres,
 * et le champ perdrait le focus au premier caractère.
 */
export function LabelMultiSelect({
  labels,
  selected,
  onChange,
  disabled,
  compact = false,
}: {
  labels: LabelOption[];
  selected: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  /**
   * Rendu DENSE, pour une cellule de tableau : le bouton se fond dans la ligne
   * - ni bordure ni hauteur de champ de formulaire - et n'affiche que les
   * labels eux-mêmes.
   */
  compact?: boolean;
}) {
  const t = useDict();
  const [query, setQuery] = useState("");

  const toggle = (id: string) => {
    onChange(
      selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id],
    );
  };

  const chosen = labels.filter((label) => selected.includes(label.id));
  const needle = foldForIndex(query.trim());
  const matching = needle
    ? labels.filter((label) => foldForIndex(label.name).includes(needle))
    : labels;

  const shown = chosen.slice(0, 3);
  const hidden = chosen.length - shown.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant={compact ? "ghost" : "outline"}
          className={cn(
            "h-auto w-full justify-start gap-1.5 font-normal",
            compact ? "-mx-1 min-h-6 px-1 py-0" : "min-h-9 py-1",
          )}
          disabled={disabled || labels.length === 0}
        >
          {!compact && <Tag className="shrink-0 opacity-60" />}
          {labels.length === 0 ? (
            <span className="text-muted-foreground">
              {t.ticketForm.noLabelsAvailable}
            </span>
          ) : chosen.length === 0 ? (
            <span className="text-muted-foreground">
              {t.ticketForm.selectLabels}
            </span>
          ) : (
            <span className="flex min-w-0 flex-wrap items-center gap-1">
              {shown.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex max-w-[9rem] items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs"
                >
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: label.color }}
                    aria-hidden
                  />
                  <span className="truncate">{label.name}</span>
                </span>
              ))}
              {hidden > 0 && (
                <span className="text-xs text-muted-foreground">+{hidden}</span>
              )}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="w-72 p-0">
        <div className="relative border-b p-1.5">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            placeholder={t.ticketForm.searchLabels}
            aria-label={t.ticketForm.searchLabels}
            className="h-8 pl-7"
          />
        </div>

        <div className="max-h-56 overflow-y-auto p-1">
          {matching.length === 0 ? (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">
              {t.ticketForm.noLabelMatches}
            </p>
          ) : (
            matching.map((label) => {
              const on = selected.includes(label.id);
              return (
                <button
                  key={label.id}
                  type="button"
                  onClick={() => toggle(label.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none",
                    on && "font-medium",
                  )}
                >
                  <span
                    className="size-2.5 shrink-0 rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/15"
                    style={{ backgroundColor: label.color }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1 truncate">{label.name}</span>
                  {on && <Check className="size-4 shrink-0 text-primary" />}
                </button>
              );
            })
          )}
        </div>

        {/* Se défaire de tout d'un geste : décocher un à un était la seule issue,
            et c'est justement le cas où l'on veut recommencer. */}
        {chosen.length > 0 && (
          <div className="border-t p-1">
            <button
              type="button"
              onClick={() => onChange([])}
              className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:bg-accent focus-visible:outline-none"
            >
              <X className="size-3.5 shrink-0" aria-hidden />
              {fmt(t.ticketForm.clearLabels, { count: chosen.length })}
            </button>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
