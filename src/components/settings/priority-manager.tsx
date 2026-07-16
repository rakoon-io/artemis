"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createTicketPriorityAction,
  deleteTicketPriorityAction,
  reorderTicketPrioritiesAction,
  updateTicketPriorityAction,
} from "@/server/actions/ticketpriority.actions";
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

/** Priorité de ticket configurable (déjà ordonnée par la query). */
export interface TicketPriorityItem {
  id: string;
  name: string;
  color: string;
}

/**
 * Gestion des priorités de ticket d'un projet (Admin) : liste (pastille de
 * couleur + nom), réordonnancement (monter / descendre), édition (nom, couleur),
 * suppression et ajout. Chaque mutation passe par une Server Action puis
 * rafraîchit la vue. La suppression d'une priorité encore utilisée est refusée
 * côté serveur - l'erreur est alors affichée en toast.
 */
export function PriorityManager({
  priorities,
  projectId,
}: {
  priorities: TicketPriorityItem[];
  projectId: string;
}) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= priorities.length) return;

    const orderedIds = priorities.map((priority) => priority.id);
    const moved = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = moved;

    setReordering(true);
    const res = await reorderTicketPrioritiesAction({ projectId, orderedIds });
    setReordering(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Ordre des priorités mis à jour.");
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    const res = await deleteTicketPriorityAction(id);
    if (!res.ok) {
      toast.error(res.error);
      setDeletingId(null);
      return;
    }
    toast.success(`Priorité « ${name} » supprimée.`);
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {priorities.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Aucune priorité pour l&apos;instant.
        </p>
      ) : (
        <ul className="space-y-2">
          {priorities.map((priority, index) => (
            <li
              key={priority.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={`Monter la priorité ${priority.name}`}
                  disabled={index === 0 || reordering}
                  onClick={() => move(index, -1)}
                >
                  <ArrowUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={`Descendre la priorité ${priority.name}`}
                  disabled={index === priorities.length - 1 || reordering}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
              </div>

              <span
                className="size-4 shrink-0 rounded-full border"
                style={{ backgroundColor: priority.color }}
                aria-hidden
              />
              <span className="flex-1 font-medium">{priority.name}</span>
              <span className="font-mono text-xs uppercase text-muted-foreground">
                {priority.color}
              </span>

              <EditPriorityDialog priority={priority} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={`Supprimer la priorité ${priority.name}`}
                disabled={deletingId === priority.id}
                onClick={() => handleDelete(priority.id, priority.name)}
              >
                {deletingId === priority.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddPriorityForm projectId={projectId} />
    </div>
  );
}

/** Dialogue d'édition d'une priorité (nom + couleur). */
function EditPriorityDialog({ priority }: { priority: TicketPriorityItem }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(priority.color);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) {
      toast.error("Le nom est requis.");
      return;
    }

    setSubmitting(true);
    const res = await updateTicketPriorityAction({ id: priority.id, name, color });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Priorité mise à jour.");
    setOpen(false);
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (next) setColor(priority.color);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Modifier la priorité ${priority.name}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la priorité</DialogTitle>
          <DialogDescription>
            Renommez la priorité ou changez sa couleur.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`priority-name-${priority.id}`}>Nom</Label>
            <Input
              id={`priority-name-${priority.id}`}
              name="name"
              defaultValue={priority.name}
              maxLength={30}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`priority-color-${priority.id}`}>Couleur</Label>
            <input
              id={`priority-color-${priority.id}`}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              aria-label="Couleur de la priorité"
            />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire d'ajout d'une priorité (placée en fin de liste). */
function AddPriorityForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState("#f59e0b");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) {
      toast.error("Le nom est requis.");
      return;
    }

    setSubmitting(true);
    const res = await createTicketPriorityAction({ projectId, name, color });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Priorité « ${name} » créée.`);
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="new-priority-name">Nouvelle priorité</Label>
        <Input
          id="new-priority-name"
          name="name"
          maxLength={30}
          placeholder="ex : Haute"
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-priority-color">Couleur</Label>
        <input
          id="new-priority-color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label="Couleur de la priorité"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
        Ajouter
      </Button>
    </form>
  );
}
