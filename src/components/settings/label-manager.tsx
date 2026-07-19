"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { Label as ProjectLabel } from "@prisma/client";
import {
  createLabelAction,
  deleteLabelAction,
} from "@/server/actions/label.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * Gestion des labels d'un projet (Admin) : liste (pastille de couleur + nom),
 * suppression et création (nom + couleur via un sélecteur natif).
 */
export function LabelManager({
  labels,
  projectId,
}: {
  labels: ProjectLabel[];
  projectId: string;
}) {
  const router = useRouter();
  const t = useDict();
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [color, setColor] = useState("#7c3aed");

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const name = String(new FormData(form).get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await createLabelAction({ projectId, name, color });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.taxonomy.labels.created, { name }));
    form.reset();
    router.refresh();
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    const res = await deleteLabelAction(id);
    if (!res.ok) {
      toast.error(res.error);
      setDeletingId(null);
      return;
    }
    toast.success(fmt(t.taxonomy.labels.deleted, { name }));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {labels.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.taxonomy.labels.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {labels.map((label) => (
            <li
              key={label.id}
              className="flex items-center gap-3 rounded-lg border p-3"
            >
              <span
                className="size-4 shrink-0 rounded-full border"
                style={{ backgroundColor: label.color }}
                aria-hidden
              />
              <span className="flex-1 font-medium">{label.name}</span>
              <span className="font-mono text-xs uppercase text-muted-foreground">
                {label.color}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-destructive"
                aria-label={fmt(t.taxonomy.labels.deleteAria, {
                  name: label.name,
                })}
                disabled={deletingId === label.id}
                onClick={() => handleDelete(label.id, label.name)}
              >
                {deletingId === label.id ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Trash2 />
                )}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3 rounded-lg border border-dashed p-3"
      >
        <div className="grid flex-1 gap-2">
          <Label htmlFor="new-label-name">{t.taxonomy.labels.newLabel}</Label>
          <Input
            id="new-label-name"
            name="name"
            maxLength={30}
            placeholder={t.taxonomy.labels.newPlaceholder}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-label-color">{t.taxonomy.color}</Label>
          <input
            id="new-label-color"
            name="color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label={t.taxonomy.labels.colorAria}
          />
        </div>
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
          {t.taxonomy.add}
        </Button>
      </form>
    </div>
  );
}
