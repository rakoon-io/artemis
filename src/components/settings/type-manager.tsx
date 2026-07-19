"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createTicketTypeAction,
  deleteTicketTypeAction,
  reorderTicketTypesAction,
  updateTicketTypeAction,
} from "@/server/actions/tickettype.actions";
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
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Type de ticket configurable (déjà ordonné par la query). */
export interface TicketTypeItem {
  id: string;
  name: string;
  color: string;
}

/**
 * Gestion des types de ticket d'un projet (Admin) : liste (pastille de couleur +
 * nom), réordonnancement (monter / descendre), édition (nom, couleur),
 * suppression et ajout. Chaque mutation passe par une Server Action puis
 * rafraîchit la vue. La suppression d'un type encore utilisé est refusée côté
 * serveur - l'erreur est alors affichée en toast.
 */
export function TypeManager({
  types,
  projectId,
}: {
  types: TicketTypeItem[];
  projectId: string;
}) {
  const router = useRouter();
  const t = useDict();
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= types.length) return;

    const orderedIds = types.map((type) => type.id);
    const moved = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = moved;

    setReordering(true);
    const res = await reorderTicketTypesAction({ projectId, orderedIds });
    setReordering(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.types.reordered);
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    const res = await deleteTicketTypeAction(id);
    if (!res.ok) {
      toast.error(res.error);
      setDeletingId(null);
      return;
    }
    toast.success(fmt(t.taxonomy.types.deleted, { name }));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {types.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.taxonomy.types.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {types.map((type, index) => (
            <li
              key={type.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6"
                  aria-label={fmt(t.taxonomy.types.moveUp, { name: type.name })}
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
                  aria-label={fmt(t.taxonomy.types.moveDown, {
                    name: type.name,
                  })}
                  disabled={index === types.length - 1 || reordering}
                  onClick={() => move(index, 1)}
                >
                  <ArrowDown />
                </Button>
              </div>

              <span
                className="size-4 shrink-0 rounded-full border"
                style={{ backgroundColor: type.color }}
                aria-hidden
              />
              <span className="flex-1 font-medium">{type.name}</span>
              <span className="font-mono text-xs uppercase text-muted-foreground">
                {type.color}
              </span>

              <EditTypeDialog type={type} />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={fmt(t.taxonomy.types.deleteAria, {
                  name: type.name,
                })}
                disabled={deletingId === type.id}
                onClick={() => handleDelete(type.id, type.name)}
              >
                {deletingId === type.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <AddTypeForm projectId={projectId} />
    </div>
  );
}

/** Dialogue d'édition d'un type (nom + couleur). */
function EditTypeDialog({ type }: { type: TicketTypeItem }) {
  const router = useRouter();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(type.color);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = String(new FormData(event.currentTarget).get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await updateTicketTypeAction({ id: type.id, name, color });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.types.updated);
    setOpen(false);
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (next) setColor(type.color);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={fmt(t.taxonomy.types.editAria, { name: type.name })}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.taxonomy.types.editTitle}</DialogTitle>
          <DialogDescription>
            {t.taxonomy.types.editDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`type-name-${type.id}`}>{t.taxonomy.name}</Label>
            <Input
              id={`type-name-${type.id}`}
              name="name"
              defaultValue={type.name}
              maxLength={30}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`type-color-${type.id}`}>{t.taxonomy.color}</Label>
            <input
              id={`type-color-${type.id}`}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              aria-label={t.taxonomy.types.colorAria}
            />
          </div>
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

/** Formulaire d'ajout d'un type (placé en fin de liste). */
function AddTypeForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const t = useDict();
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState("#0ea5e9");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await createTicketTypeAction({ projectId, name, color });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.taxonomy.types.created, { name }));
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
    >
      <div className="grid flex-1 gap-2">
        <Label htmlFor="new-type-name">{t.taxonomy.types.newLabel}</Label>
        <Input
          id="new-type-name"
          name="name"
          maxLength={30}
          placeholder={t.taxonomy.types.newPlaceholder}
          required
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-type-color">{t.taxonomy.color}</Label>
        <input
          id="new-type-color"
          type="color"
          value={color}
          onChange={(event) => setColor(event.target.value)}
          className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
          aria-label={t.taxonomy.types.colorAria}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
        {t.taxonomy.add}
      </Button>
    </form>
  );
}
