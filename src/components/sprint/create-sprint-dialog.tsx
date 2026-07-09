"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { createSprintAction } from "@/server/actions/sprint.actions";
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
 * Boîte de dialogue de création d'un sprint / lot (réservée aux admins côté UI).
 * Les dates vont par paire : les deux, ou aucune (validé aussi côté serveur).
 */
export function CreateSprintDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    const goal = String(formData.get("goal") ?? "").trim();

    setSubmitting(true);
    const res = await createSprintAction({
      projectId,
      name,
      goal: goal || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });
    setSubmitting(false);

    if (!res.ok) {
      toast.error(res.error);
      return;
    }

    toast.success(`Sprint « ${name} » créé.`);
    setOpen(false);
    setStartDate("");
    setEndDate("");
    form.reset();
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nouveau sprint
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau sprint</DialogTitle>
          <DialogDescription>
            Sans dates, c&apos;est un simple lot ; ajoutez un objectif et des
            dates pour en faire une itération.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="sprint-name">Nom</Label>
            <Input
              id="sprint-name"
              name="name"
              maxLength={80}
              placeholder="Sprint 1"
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="sprint-goal">Objectif (optionnel)</Label>
            <Textarea
              id="sprint-goal"
              name="goal"
              maxLength={500}
              placeholder="But de l'itération…"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="sprint-start">Début</Label>
              <Input
                id="sprint-start"
                name="startDate"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                max={endDate || undefined}
                required={endDate.length > 0}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="sprint-end">Fin</Label>
              <Input
                id="sprint-end"
                name="endDate"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                min={startDate || undefined}
                required={startDate.length > 0}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Renseignez les deux dates, ou aucune.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Créer le sprint
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
