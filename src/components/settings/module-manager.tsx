"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import {
  createModuleAction,
  deleteModuleAction,
  reorderModulesAction,
  updateModuleAction,
} from "@/server/actions/module.actions";
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
import { InlineEdit } from "@/components/ui/inline-edit";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Module fonctionnel configurable (déjà ordonné par la query). */
export interface ModuleItem {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

/** Composant rattaché, pour montrer ce que chaque module regroupe. */
export interface ModuleComponentItem {
  id: string;
  name: string;
  moduleId: string | null;
}

/**
 * Gestion des MODULES fonctionnels d'un projet (Admin) : les domaines à grosse
 * maille (« Gestion des utilisateurs ») qui regroupent les composants.
 *
 * Même ergonomie que les autres gestionnaires de catalogue (liste ordonnée,
 * monter/descendre, édition, suppression, ajout). Chaque ligne rappelle les
 * composants rattachés : c'est la seule vue où la hiérarchie module → composants
 * se lit d'un bloc, et cela rend visible ce qu'une suppression impliquerait.
 * La suppression d'un module encore utilisé est refusée côté serveur.
 */
export function ModuleManager({
  modules,
  components,
  projectId,
}: {
  modules: ModuleItem[];
  /** Tous les composants du projet, pour afficher le regroupement. */
  components: ModuleComponentItem[];
  projectId: string;
}) {
  const router = useRouter();
  const t = useDict();
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= modules.length) return;

    const orderedIds = modules.map((module) => module.id);
    const moved = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = moved;

    setReordering(true);
    const res = await reorderModulesAction({ projectId, orderedIds });
    setReordering(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.modules.reordered);
    router.refresh();
  }

  /**
   * Enregistre UN champ d'un module (édition en place). Le schéma Zod accepte
   * une mise à jour partielle : les champs absents ne sont pas touchés.
   */
  async function saveModule(
    id: string,
    patch: { name?: string; description?: string },
  ): Promise<boolean> {
    const res = await updateModuleAction({ id, ...patch });
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    toast.success(t.common.inline.saved);
    router.refresh();
    return true;
  }

  async function handleDelete(id: string, name: string) {
    setDeletingId(id);
    const res = await deleteModuleAction(id);
    if (!res.ok) {
      toast.error(res.error);
      setDeletingId(null);
      return;
    }
    toast.success(fmt(t.taxonomy.modules.deleted, { name }));
    setDeletingId(null);
    router.refresh();
  }

  // Sans aucun module déclaré, TOUS les composants sont « sans module » : le bloc
  // n'apprendrait rien et ferait double emploi avec l'onglet Composants.
  const orphans =
    modules.length > 0 ? components.filter((c) => !c.moduleId) : [];

  return (
    <div className="space-y-6">
      {modules.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.taxonomy.modules.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {modules.map((module, index) => {
            const attached = components.filter((c) => c.moduleId === module.id);
            return (
              <li
                key={module.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={fmt(t.taxonomy.modules.moveUp, {
                      name: module.name,
                    })}
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
                    aria-label={fmt(t.taxonomy.modules.moveDown, {
                      name: module.name,
                    })}
                    disabled={index === modules.length - 1 || reordering}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>

                <span
                  className="mt-1.5 size-4 shrink-0 rounded-full border"
                  style={{ backgroundColor: module.color }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  {/* Nom et description s'éditent au clic ; le dialogue reste
                      pour la couleur, qui n'est pas du texte. */}
                  <InlineEdit
                    value={module.name}
                    field={t.taxonomy.name}
                    required
                    maxLength={60}
                    className="font-medium"
                    onSave={(next) => saveModule(module.id, { name: next })}
                  />
                  <InlineEdit
                    value={module.description ?? ""}
                    field={t.taxonomy.modules.descriptionLabel}
                    multiline
                    rows={2}
                    maxLength={500}
                    className="text-sm text-muted-foreground"
                    onSave={(next) =>
                      saveModule(module.id, { description: next })
                    }
                  />
                  {attached.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {attached.map((c) => c.name).join(" · ")}
                    </p>
                  )}
                </div>

                <span className="mt-1 font-mono text-xs uppercase text-muted-foreground">
                  {module.color}
                </span>

                <EditModuleDialog module={module} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={fmt(t.taxonomy.modules.deleteAria, {
                    name: module.name,
                  })}
                  disabled={deletingId === module.id}
                  onClick={() => handleDelete(module.id, module.name)}
                >
                  {deletingId === module.id ? (
                    <Loader2 className="animate-spin" />
                  ) : (
                    <Trash2 />
                  )}
                </Button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Composants transverses : rendre visible qu'ils n'appartiennent à aucun
          module, et que c'est un choix légitime (typiquement les réutilisables). */}
      {orphans.length > 0 && (
        <div className="rounded-lg border border-dashed p-3">
          <p className="text-sm font-medium">
            {t.taxonomy.modules.unassignedHeading}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {orphans.map((c) => c.name).join(" · ")}
          </p>
        </div>
      )}

      <AddModuleForm projectId={projectId} />
    </div>
  );
}

/** Dialogue d'édition d'un module (nom, couleur, description). */
function EditModuleDialog({ module }: { module: ModuleItem }) {
  const router = useRouter();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(module.color);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }
    const description = String(form.get("description") ?? "").trim();

    setSubmitting(true);
    const res = await updateModuleAction({
      id: module.id,
      name,
      description,
      color,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.modules.updated);
    setOpen(false);
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (next) setColor(module.color);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={fmt(t.taxonomy.modules.editAria, { name: module.name })}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.taxonomy.modules.editTitle}</DialogTitle>
          <DialogDescription>
            {t.taxonomy.modules.editDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`module-name-${module.id}`}>{t.taxonomy.name}</Label>
            <Input
              id={`module-name-${module.id}`}
              name="name"
              defaultValue={module.name}
              maxLength={60}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`module-color-${module.id}`}>{t.taxonomy.color}</Label>
            <input
              id={`module-color-${module.id}`}
              type="color"
              value={color}
              onChange={(event) => setColor(event.target.value)}
              className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
              aria-label={t.taxonomy.modules.colorAria}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`module-description-${module.id}`}>
              {t.taxonomy.modules.descriptionLabel}
            </Label>
            <Textarea
              id={`module-description-${module.id}`}
              name="description"
              defaultValue={module.description ?? ""}
              placeholder={t.taxonomy.modules.descriptionPlaceholder}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {t.taxonomy.modules.descriptionHint}
            </p>
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

/** Formulaire d'ajout d'un module (placé en fin de liste). */
function AddModuleForm({ projectId }: { projectId: string }) {
  const router = useRouter();
  const t = useDict();
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState("#2563EB");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }
    const description = String(data.get("description") ?? "").trim();

    setSubmitting(true);
    const res = await createModuleAction({
      projectId,
      name,
      description,
      color,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.taxonomy.modules.created, { name }));
    form.reset();
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-2">
          <Label htmlFor="new-module-name">{t.taxonomy.modules.newLabel}</Label>
          <Input
            id="new-module-name"
            name="name"
            maxLength={60}
            placeholder={t.taxonomy.modules.newPlaceholder}
            required
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-module-color">{t.taxonomy.color}</Label>
          <input
            id="new-module-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label={t.taxonomy.modules.colorAria}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-module-description">
          {t.taxonomy.modules.descriptionLabel}
        </Label>
        <Textarea
          id="new-module-description"
          name="description"
          placeholder={t.taxonomy.modules.descriptionPlaceholder}
          rows={2}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {t.taxonomy.modules.descriptionHint}
        </p>
      </div>
      {/* Bouton en fin de formulaire, après la description : sinon on valide
          avant même d'avoir vu ce champ (cf. le même correctif sur les composants). */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
          {t.taxonomy.add}
        </Button>
      </div>
    </form>
  );
}
