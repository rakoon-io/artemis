"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CalendarRange, Flag, Loader2, Pencil, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InlineEdit } from "@/components/ui/inline-edit";
import { formatDate } from "@/lib/utils";
import { updateSprintAction } from "@/server/actions/sprint.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * ÉDITION EN PLACE des champs d'un sprint : nom, objectif, dates. Il n'y a plus
 * de dialogue - on clique sur ce que l'on veut changer, là où on le lit.
 *
 * Le nom et l'objectif passent par la primitive partagée `InlineEdit` (mêmes
 * raccourcis, même affordance, même accessibilité que partout ailleurs). Les
 * DATES ont besoin d'un composant propre : elles vont par PAIRE, et la primitive
 * ne sait éditer qu'une valeur à la fois. Les enregistrer séparément ferait
 * échouer la règle « les deux dates, ou aucune » à chaque première moitié de
 * saisie.
 *
 * L'état (Planifié / Actif / Terminé) reste hors de l'édition en place : il a ses
 * boutons Démarrer / Clôturer / Rouvrir, qui portent chacun une intention. Le
 * rendre modifiable d'un clic sur un badge laisserait croire qu'on peut sauter de
 * « planifié » à « terminé » aussi anodinement qu'on corrige une coquille.
 */

/** Format `YYYY-MM-DD` attendu par `<input type="date">`. */
export function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  // Les dates sont enregistrées à minuit UTC (`new Date("2026-07-30")` côté
  // service) : les relire en UTC redonne donc exactement le jour saisi.
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

/** Enregistre un sous-ensemble de champs du sprint ; `false` en cas d'échec. */
function useSprintSaver(sprintId: string) {
  const router = useRouter();
  const t = useDict();

  return async function save(
    patch: Omit<Parameters<typeof updateSprintAction>[0], "id">,
  ): Promise<boolean> {
    const res = await updateSprintAction({ id: sprintId, ...patch });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(t.common.inline.saved);
    router.refresh();
    return true;
  };
}

/** Nom du sprint, modifiable au clic. */
export function SprintNameInline({
  sprintId,
  value,
  canEdit,
}: {
  sprintId: string;
  value: string;
  canEdit: boolean;
}) {
  const t = useDict();
  const save = useSprintSaver(sprintId);
  return (
    <InlineEdit
      value={value}
      field={t.sprints.nameLabel}
      required
      maxLength={80}
      disabled={!canEdit}
      className="text-base font-semibold"
      onSave={(next) => save({ name: next })}
    />
  );
}

/** Objectif du sprint : facultatif, donc effaçable (chaîne vide → `null`). */
export function SprintGoalInline({
  sprintId,
  value,
  canEdit,
}: {
  sprintId: string;
  value: string | null;
  canEdit: boolean;
}) {
  const t = useDict();
  const save = useSprintSaver(sprintId);
  return (
    <InlineEdit
      value={value ?? ""}
      field={t.sprints.goalLabel}
      multiline
      rows={3}
      maxLength={500}
      disabled={!canEdit}
      // Un objectif vidé redevient `null` : c'est un champ facultatif, pas une
      // chaîne vide - la carte doit pouvoir réafficher « Sans objectif défini. »
      emptyLabel={t.sprints.noGoal}
      className="text-sm text-muted-foreground"
      onSave={(next) => save({ goal: next || null })}
    />
  );
}

/**
 * Période du sprint. En lecture : « début → fin », ou la mention de lot lorsque
 * aucune date n'est posée. À l'édition : les deux champs ensemble, plus un geste
 * explicite pour tout retirer et redevenir un lot.
 */
export function SprintDatesInline({
  sprintId,
  startDate,
  endDate,
  canEdit,
}: {
  sprintId: string;
  startDate: Date | string | null;
  endDate: Date | string | null;
  canEdit: boolean;
}) {
  const t = useDict();
  const save = useSprintSaver(sprintId);
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [start, setStart] = useState(toDateInput(startDate));
  const [end, setEnd] = useState(toDateInput(endDate));

  const isLot = !startDate && !endDate;

  const readBody = isLot ? (
    <>
      <Flag className="size-4 shrink-0" aria-hidden />
      {t.sprints.lotNoDates}
    </>
  ) : (
    <>
      <CalendarRange className="size-4 shrink-0" aria-hidden />
      {formatDate(startDate)} <span aria-hidden>→</span> {formatDate(endDate)}
    </>
  );

  if (!canEdit) {
    return (
      <span className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        {readBody}
      </span>
    );
  }

  async function commit(nextStart: string, nextEnd: string) {
    setPending(true);
    // Toujours les DEUX dates : la règle métier les lie, et `null` des deux côtés
    // est la façon de redevenir un simple lot.
    const ok = await save({
      startDate: nextStart || null,
      endDate: nextEnd || null,
    });
    setPending(false);
    if (ok) setEditing(false);
  }

  if (editing) {
    return (
      <span className="block space-y-2">
        <span className="flex flex-wrap items-end gap-2">
          <span className="grid gap-1">
            <label
              htmlFor={`sprint-start-${sprintId}`}
              className="text-xs text-muted-foreground"
            >
              {t.sprints.startDateLabel}
            </label>
            <Input
              id={`sprint-start-${sprintId}`}
              type="date"
              value={start}
              max={end || undefined}
              disabled={pending}
              onChange={(event) => setStart(event.target.value)}
              className="h-8 w-auto"
            />
          </span>
          <span className="grid gap-1">
            <label
              htmlFor={`sprint-end-${sprintId}`}
              className="text-xs text-muted-foreground"
            >
              {t.sprints.endDateLabel}
            </label>
            <Input
              id={`sprint-end-${sprintId}`}
              type="date"
              value={end}
              min={start || undefined}
              disabled={pending}
              onChange={(event) => setEnd(event.target.value)}
              className="h-8 w-auto"
            />
          </span>
        </span>
        <span className="flex flex-wrap items-center gap-1.5">
          <Button
            type="button"
            size="sm"
            disabled={pending}
            onClick={() => void commit(start, end)}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending}
            onClick={() => {
              setStart(toDateInput(startDate));
              setEnd(toDateInput(endDate));
              setEditing(false);
            }}
          >
            {t.common.cancel}
          </Button>
          {!isLot && (
            // Retirer les dates n'est pas évident à deviner (il faudrait vider
            // deux champs) : on en fait un geste nommé.
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-muted-foreground"
              disabled={pending}
              onClick={() => {
                setStart("");
                setEnd("");
                void commit("", "");
              }}
            >
              <X />
              {t.sprints.clearDates}
            </Button>
          )}
        </span>
        <span className="block text-xs text-muted-foreground">
          {t.sprints.datesHint}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setStart(toDateInput(startDate));
        setEnd(toDateInput(endDate));
        setEditing(true);
      }}
      title={fmt(t.common.inline.editAria, { field: t.sprints.datesField })}
      aria-label={fmt(t.common.inline.editAria, { field: t.sprints.datesField })}
      className="group/inline -mx-2 flex w-full cursor-text flex-wrap items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm text-muted-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {readBody}
      <Pencil
        className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
        aria-hidden
      />
    </button>
  );
}
