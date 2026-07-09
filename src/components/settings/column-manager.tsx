"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createColumnAction,
  deleteColumnAction,
  reorderColumnsAction,
  updateColumnAction,
} from "@/server/actions/column.actions";
import { Badge } from "@/components/ui/badge";
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

/** Colonne de tableau enrichie de son nombre de tickets (calculé en amont). */
export interface ColumnSummary {
  id: string;
  name: string;
  wipLimit: number | null;
  ticketCount: number;
}

/** Analyse une saisie de limite WIP : "" → `undefined`, sinon un entier > 0. */
function parseWip(
  raw: string,
): { ok: true; value: number | undefined } | { ok: false } {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, value: undefined };
  const value = Number(trimmed);
  if (!Number.isInteger(value) || value < 1) return { ok: false };
  return { ok: true, value };
}

/**
 * Gestion des colonnes du workflow (Admin) : réordonnancement (monter /
 * descendre), édition (nom, limite WIP), suppression et ajout. Chaque mutation
 * passe par une Server Action puis rafraîchit la vue.
 */
export function ColumnManager({
  columns,
  projectId,
}: {
  columns: ColumnSummary[];
  projectId: string;
}) {
  const router = useRouter();
  const [reordering, setReordering] = useState(false);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= columns.length) return;

    const orderedIds = columns.map((column) => column.id);
    const moved = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = moved;

    setReordering(true);
    const res = await reorderColumnsAction({ projectId, orderedIds });
    setReordering(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Ordre des colonnes mis à jour.");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <ul className="space-y-2">
        {columns.map((column, index) => (
          <li
            key={column.id}
            className="flex items-center gap-3 rounded-lg border p-3"
          >
            <div className="flex flex-col">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-6"
                aria-label={`Monter la colonne ${column.name}`}
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
                aria-label={`Descendre la colonne ${column.name}`}
                disabled={index === columns.length - 1 || reordering}
                onClick={() => move(index, 1)}
              >
                <ArrowDown />
              </Button>
            </div>

            <div className="flex flex-1 flex-wrap items-center gap-2">
              <span className="font-medium">{column.name}</span>
              {column.wipLimit != null && (
                <Badge
                  variant={
                    column.ticketCount > column.wipLimit
                      ? "destructive"
                      : "secondary"
                  }
                >
                  WIP {column.ticketCount}/{column.wipLimit}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                {column.ticketCount} ticket{column.ticketCount > 1 ? "s" : ""}
              </span>
            </div>

            <EditColumnDialog column={column} />
            <DeleteColumnDialog
              column={column}
              canDelete={columns.length > 1}
            />
          </li>
        ))}
      </ul>

      <AddColumnForm projectId={projectId} />
    </div>
  );
}

/** Dialogue d'édition d'une colonne (nom + limite WIP). */
function EditColumnDialog({ column }: { column: ColumnSummary }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      toast.error("Le nom est requis.");
      return;
    }
    const wip = parseWip(String(formData.get("wip") ?? ""));
    if (!wip.ok) {
      toast.error("La limite WIP doit être un entier positif.");
      return;
    }

    setSubmitting(true);
    // `undefined` → on retire la limite (envoyée en `null`).
    const res = await updateColumnAction({
      id: column.id,
      name,
      wipLimit: wip.value ?? null,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success("Colonne mise à jour.");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Modifier la colonne ${column.name}`}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la colonne</DialogTitle>
          <DialogDescription>
            Renommez la colonne ou ajustez sa limite d&apos;en-cours (WIP).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`col-name-${column.id}`}>Nom</Label>
            <Input
              id={`col-name-${column.id}`}
              name="name"
              defaultValue={column.name}
              maxLength={40}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`col-wip-${column.id}`}>
              Limite WIP (optionnel)
            </Label>
            <Input
              id={`col-wip-${column.id}`}
              name="wip"
              type="number"
              min={1}
              max={999}
              defaultValue={column.wipLimit ?? ""}
              placeholder="Aucune"
            />
            <p className="text-xs text-muted-foreground">
              Laissez vide pour retirer la limite.
            </p>
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

/** Dialogue de confirmation de suppression d'une colonne. */
function DeleteColumnDialog({
  column,
  canDelete,
}: {
  column: ColumnSummary;
  canDelete: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    const res = await deleteColumnAction(column.id);
    if (!res.ok) {
      toast.error(res.error);
      setSubmitting(false);
      return;
    }
    toast.success(`Colonne « ${column.name} » supprimée.`);
    setOpen(false);
    setSubmitting(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-destructive"
          disabled={!canDelete}
          aria-label={`Supprimer la colonne ${column.name}`}
          title={
            canDelete ? undefined : "Impossible de supprimer l'unique colonne."
          }
        >
          <Trash2 />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer « {column.name} » ?</DialogTitle>
          <DialogDescription>
            {column.ticketCount > 0
              ? `Les ${column.ticketCount} ticket${
                  column.ticketCount > 1 ? "s" : ""
                } de cette colonne seront réaffectés à la première colonne du tableau.`
              : "Les tickets qui s'y trouveraient seraient réaffectés à la première colonne du tableau."}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Formulaire d'ajout d'une colonne (placée en fin de tableau). */
function AddColumnForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const name = String(formData.get("name") ?? "").trim();
    if (!name) {
      toast.error("Le nom est requis.");
      return;
    }
    const wip = parseWip(String(formData.get("wip") ?? ""));
    if (!wip.ok) {
      toast.error("La limite WIP doit être un entier positif.");
      return;
    }

    setSubmitting(true);
    const res = await createColumnAction({
      projectId,
      name,
      wipLimit: wip.value,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(`Colonne « ${name} » ajoutée.`);
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="new-col-name">Nouvelle colonne</Label>
        <Input
          id="new-col-name"
          name="name"
          maxLength={40}
          placeholder="ex : En test"
          required
        />
      </div>
      <div className="grid w-24 gap-2">
        <Label htmlFor="new-col-wip">WIP</Label>
        <Input
          id="new-col-wip"
          name="wip"
          type="number"
          min={1}
          max={999}
          placeholder="—"
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
        Ajouter
      </Button>
    </form>
  );
}
