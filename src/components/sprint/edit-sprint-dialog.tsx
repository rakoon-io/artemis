"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";
import { updateSprintAction } from "@/server/actions/sprint.actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/**
 * Modification d'un sprint / lot : nom, objectif, dates. Mêmes champs et mêmes
 * règles que la création (les dates vont par paire), ouverte comme elle à tout
 * membre du projet - le serveur impose l'accès au projet.
 *
 * L'ÉTAT ne se règle pas ici : il a ses propres boutons (Démarrer / Clôturer /
 * Rouvrir), qui portent chacun une intention claire. Un menu déroulant d'états
 * dans ce formulaire laisserait croire qu'on peut sauter de « planifié » à
 * « terminé » comme on renomme un sprint.
 *
 * ⚠ Différence de fond avec la création : ici on envoie des `null` EXPLICITES
 * pour l'objectif et les dates vidés. Le service applique la convention
 * « `undefined` = ne pas toucher » ; transmettre `undefined` comme le fait le
 * formulaire de création rendrait donc impossible d'EFFACER un objectif ou de
 * ramener un sprint à l'état de simple lot.
 */

/** Format `YYYY-MM-DD` attendu par `<input type="date">`. */
function toDateInput(value: Date | string | null): string {
  if (!value) return "";
  // Les dates sont enregistrées à minuit UTC (`new Date("2026-07-30")` côté
  // service) : les relire en UTC redonne donc exactement le jour saisi.
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

export interface EditableSprint {
  id: string;
  projectId: string;
  name: string;
  goal: string | null;
  startDate: Date | string | null;
  endDate: Date | string | null;
}

export function EditSprintDialog({ sprint }: { sprint: EditableSprint }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState(toDateInput(sprint.startDate));
  const [endDate, setEndDate] = useState(toDateInput(sprint.endDate));

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    // À la réouverture, on repart des valeurs du serveur : après un abandon, le
    // formulaire ne doit pas conserver une saisie qui n'a jamais été enregistrée.
    if (next) {
      setStartDate(toDateInput(sprint.startDate));
      setEndDate(toDateInput(sprint.endDate));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const goal = String(formData.get("goal") ?? "").trim();
    if (!name) {
      toast.error(t.sprints.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await updateSprintAction(sprint.id, {
      projectId: sprint.projectId,
      name,
      // `null` et non `undefined` : cf. l'avertissement en tête de fichier.
      goal: goal || null,
      startDate: startDate || null,
      endDate: endDate || null,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(fmt(t.sprints.toastUpdated, { name }));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={fmt(t.sprints.editSprintAria, { name: sprint.name })}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.sprints.editSprint}</DialogTitle>
          <DialogDescription>{t.sprints.editDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`sprint-name-${sprint.id}`}>
              {t.sprints.nameLabel}
            </Label>
            <Input
              id={`sprint-name-${sprint.id}`}
              name="name"
              defaultValue={sprint.name}
              maxLength={80}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`sprint-goal-${sprint.id}`}>
              {t.sprints.goalLabel}
            </Label>
            <Textarea
              id={`sprint-goal-${sprint.id}`}
              name="goal"
              defaultValue={sprint.goal ?? ""}
              maxLength={500}
              placeholder={t.sprints.goalPlaceholder}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor={`sprint-start-${sprint.id}`}>
                {t.sprints.startDateLabel}
              </Label>
              <Input
                id={`sprint-start-${sprint.id}`}
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate || undefined}
                required={endDate.length > 0}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`sprint-end-${sprint.id}`}>
                {t.sprints.endDateLabel}
              </Label>
              <Input
                id={`sprint-end-${sprint.id}`}
                name="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
                required={startDate.length > 0}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{t.sprints.datesHint}</p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                {t.common.cancel}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              {t.common.save}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
