"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { ComponentKind } from "@prisma/client";
import {
  createComponentAction,
  deleteComponentAction,
  reorderComponentsAction,
  updateComponentAction,
} from "@/server/actions/component.actions";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { InlineEdit } from "@/components/ui/inline-edit";
import {
  COMPONENT_KIND_ICONS,
  NO_MODULE,
  type ModuleOption,
} from "@/components/ticket/ticket-fields";
import { ModuleSelect } from "@/components/ticket/module-select";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/** Composant applicatif configurable (déjà ordonné par la query). */
export interface ComponentItem {
  id: string;
  name: string;
  kind: ComponentKind;
  /** Module de rattachement, ou `null` pour un composant transverse. */
  moduleId: string | null;
  /** Module résolu, pour l'afficher sans re-croiser la liste des modules. */
  module?: { id: string; name: string; color: string } | null;
  description: string | null;
  color: string;
}

/** Natures proposées, dans l'ordre d'affichage des sélecteurs. */
const KINDS: ComponentKind[] = [
  ComponentKind.PAGE,
  ComponentKind.SHARED,
  ComponentKind.SERVICE,
];

/**
 * Gestion du CATALOGUE DE COMPOSANTS d'un projet (Admin) : la liste des briques
 * applicatives - pages, composants réutilisables, services - auxquelles rattacher
 * un ticket pour contextualiser la demande.
 *
 * Même ergonomie que les gestionnaires de types / priorités (liste ordonnée,
 * monter/descendre, édition, suppression, ajout), enrichie de deux champs
 * propres aux composants : la NATURE et une DESCRIPTION libre - cette dernière
 * étant transmise à l'IA lors de la génération de tickets depuis un texte.
 * La suppression d'un composant référencé par des tickets est refusée côté
 * serveur ; l'erreur est alors affichée en toast.
 */
export function ComponentManager({
  components,
  modules,
  projectId,
}: {
  components: ComponentItem[];
  /** Modules du projet ; vide = le champ « Module » n'est pas rendu. */
  modules: ModuleOption[];
  projectId: string;
}) {
  const router = useRouter();
  const t = useDict();
  const [reordering, setReordering] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= components.length) return;

    const orderedIds = components.map((component) => component.id);
    const moved = orderedIds[index];
    orderedIds[index] = orderedIds[target];
    orderedIds[target] = moved;

    setReordering(true);
    const res = await reorderComponentsAction({ projectId, orderedIds });
    setReordering(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.components.reordered);
    router.refresh();
  }

  /**
   * Enregistre UN champ d'un composant (édition en place). Le schéma Zod accepte
   * une mise à jour partielle : les champs absents ne sont pas touchés.
   */
  async function saveComponent(
    id: string,
    patch: { name?: string; description?: string },
  ): Promise<boolean> {
    const res = await updateComponentAction({ id, ...patch });
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
    const res = await deleteComponentAction(id);
    if (!res.ok) {
      toast.error(res.error);
      setDeletingId(null);
      return;
    }
    toast.success(fmt(t.taxonomy.components.deleted, { name }));
    setDeletingId(null);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {components.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.taxonomy.components.empty}
        </p>
      ) : (
        <ul className="space-y-2">
          {components.map((component, index) => {
            const Icon = COMPONENT_KIND_ICONS[component.kind];
            return (
              <li
                key={component.id}
                className="flex items-start gap-3 rounded-lg border p-3"
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="size-6"
                    aria-label={fmt(t.taxonomy.components.moveUp, {
                      name: component.name,
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
                    aria-label={fmt(t.taxonomy.components.moveDown, {
                      name: component.name,
                    })}
                    disabled={index === components.length - 1 || reordering}
                    onClick={() => move(index, 1)}
                  >
                    <ArrowDown />
                  </Button>
                </div>

                <Icon
                  className="mt-1 size-4 shrink-0"
                  style={{ color: component.color }}
                  aria-hidden
                />

                <div className="min-w-0 flex-1">
                  {/* Nom et description s'éditent au clic ; le dialogue reste
                      pour la nature, la couleur et le module. */}
                  <InlineEdit
                    value={component.name}
                    field={t.taxonomy.name}
                    required
                    maxLength={60}
                    className="font-medium"
                    onSave={(next) => saveComponent(component.id, { name: next })}
                  />
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    {t.taxonomy.componentKinds[component.kind]}
                    {/* Le module est modifiable depuis cette liste : il doit
                        donc y être lisible, sans avoir à ouvrir le dialogue. */}
                    {component.module && (
                      <>
                        <span aria-hidden>·</span>
                        <span className="inline-flex items-center gap-1">
                          <span
                            className="size-2 shrink-0 rounded-full"
                            style={{ backgroundColor: component.module.color }}
                            aria-hidden
                          />
                          {component.module.name}
                        </span>
                      </>
                    )}
                  </p>
                  <InlineEdit
                    value={component.description ?? ""}
                    field={t.taxonomy.components.descriptionLabel}
                    multiline
                    rows={2}
                    maxLength={500}
                    className="text-sm text-muted-foreground"
                    onSave={(next) =>
                      saveComponent(component.id, { description: next })
                    }
                  />
                </div>

                <span className="mt-1 font-mono text-xs uppercase text-muted-foreground">
                  {component.color}
                </span>

                <EditComponentDialog component={component} modules={modules} />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-destructive"
                  aria-label={fmt(t.taxonomy.components.deleteAria, {
                    name: component.name,
                  })}
                  disabled={deletingId === component.id}
                  onClick={() => handleDelete(component.id, component.name)}
                >
                  {deletingId === component.id ? (
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

      <AddComponentForm projectId={projectId} modules={modules} />
    </div>
  );
}

/** Sélecteur de nature, partagé par les formulaires d'ajout et d'édition. */
function KindSelect({
  id,
  value,
  onChange,
}: {
  id: string;
  value: ComponentKind;
  onChange: (kind: ComponentKind) => void;
}) {
  const t = useDict();
  return (
    <Select value={value} onValueChange={(v) => onChange(v as ComponentKind)}>
      <SelectTrigger id={id} aria-label={t.taxonomy.components.kindAria}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {KINDS.map((kind) => {
          const Icon = COMPONENT_KIND_ICONS[kind];
          return (
            <SelectItem key={kind} value={kind}>
              <span className="flex items-center gap-2">
                <Icon className="size-3.5 shrink-0" aria-hidden />
                {t.taxonomy.componentKinds[kind]}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

/** Dialogue d'édition d'un composant (nom, nature, couleur, description). */
function EditComponentDialog({
  component,
  modules,
}: {
  component: ComponentItem;
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState(component.color);
  const [kind, setKind] = useState<ComponentKind>(component.kind);
  const [moduleId, setModuleId] = useState<string>(
    component.moduleId ?? NO_MODULE,
  );

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
    const res = await updateComponentAction({
      id: component.id,
      name,
      kind,
      moduleId: moduleId === NO_MODULE ? null : moduleId,
      description,
      color,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.taxonomy.components.updated);
    setOpen(false);
    router.refresh();
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    // Réouvrir le dialogue repart toujours des valeurs enregistrées.
    if (next) {
      setColor(component.color);
      setKind(component.kind);
      setModuleId(component.moduleId ?? NO_MODULE);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={fmt(t.taxonomy.components.editAria, {
            name: component.name,
          })}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.taxonomy.components.editTitle}</DialogTitle>
          <DialogDescription>
            {t.taxonomy.components.editDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`component-name-${component.id}`}>
              {t.taxonomy.name}
            </Label>
            <Input
              id={`component-name-${component.id}`}
              name="name"
              defaultValue={component.name}
              maxLength={60}
              required
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="grid gap-2">
              <Label htmlFor={`component-kind-${component.id}`}>
                {t.taxonomy.components.kindLabel}
              </Label>
              <KindSelect
                id={`component-kind-${component.id}`}
                value={kind}
                onChange={setKind}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor={`component-color-${component.id}`}>
                {t.taxonomy.color}
              </Label>
              <input
                id={`component-color-${component.id}`}
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
                aria-label={t.taxonomy.components.colorAria}
              />
            </div>
          </div>
          <ModuleSelect
            id={`component-module-${component.id}`}
            modules={modules}
            value={moduleId}
            onChange={setModuleId}
            label={t.taxonomy.components.moduleLabel}
            ariaLabel={t.taxonomy.components.moduleAria}
            emptyValue={NO_MODULE}
            emptyLabel={t.taxonomy.modules.noModule}
          />
          <div className="grid gap-2">
            <Label htmlFor={`component-description-${component.id}`}>
              {t.taxonomy.components.descriptionLabel}
            </Label>
            <Textarea
              id={`component-description-${component.id}`}
              name="description"
              defaultValue={component.description ?? ""}
              placeholder={t.taxonomy.components.descriptionPlaceholder}
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {t.taxonomy.components.descriptionHint}
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

/** Formulaire d'ajout d'un composant (placé en fin de catalogue). */
function AddComponentForm({
  projectId,
  modules,
}: {
  projectId: string;
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const t = useDict();
  const [submitting, setSubmitting] = useState(false);
  const [color, setColor] = useState("#8B5CF6");
  const [kind, setKind] = useState<ComponentKind>(ComponentKind.PAGE);
  const [moduleId, setModuleId] = useState<string>(NO_MODULE);

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
    const res = await createComponentAction({
      projectId,
      name,
      kind,
      moduleId: moduleId === NO_MODULE ? null : moduleId,
      description,
      color,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.taxonomy.components.created, { name }));
    form.reset();
    setKind(ComponentKind.PAGE);
    setModuleId(NO_MODULE);
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-lg border border-dashed p-3"
    >
      <div className="flex flex-wrap items-end gap-3">
        <div className="grid min-w-48 flex-1 gap-2">
          <Label htmlFor="new-component-name">
            {t.taxonomy.components.newLabel}
          </Label>
          <Input
            id="new-component-name"
            name="name"
            maxLength={60}
            placeholder={t.taxonomy.components.newPlaceholder}
            required
          />
        </div>
        <div className="grid w-52 gap-2">
          <Label htmlFor="new-component-kind">
            {t.taxonomy.components.kindLabel}
          </Label>
          <KindSelect id="new-component-kind" value={kind} onChange={setKind} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="new-component-color">{t.taxonomy.color}</Label>
          <input
            id="new-component-color"
            type="color"
            value={color}
            onChange={(event) => setColor(event.target.value)}
            className="h-9 w-12 cursor-pointer rounded-md border border-input bg-transparent p-1"
            aria-label={t.taxonomy.components.colorAria}
          />
        </div>
        {/* Pas de conteneur ici : `ModuleSelect` ne rend rien sans module, et un
            wrapper vide laisserait un trou dans la rangée de champs. */}
        <div className={modules.length > 0 ? "grid w-52 gap-2" : "contents"}>
          <ModuleSelect
            id="new-component-module"
            modules={modules}
            value={moduleId}
            onChange={setModuleId}
            label={t.taxonomy.components.moduleLabel}
            ariaLabel={t.taxonomy.components.moduleAria}
            emptyValue={NO_MODULE}
            emptyLabel={t.taxonomy.modules.noModule}
          />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="new-component-description">
          {t.taxonomy.components.descriptionLabel}
        </Label>
        <Textarea
          id="new-component-description"
          name="description"
          placeholder={t.taxonomy.components.descriptionPlaceholder}
          rows={2}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {t.taxonomy.components.descriptionHint}
        </p>
      </div>
      {/* Le bouton ferme le formulaire, APRÈS la description : placé dans la
          première ligne, il précédait ce champ dans l'ordre visuel comme dans
          l'ordre de tabulation, et l'on validait avant de l'avoir vu - alors que
          c'est justement lui qui nourrit le contexte transmis à l'IA. */}
      <div className="flex justify-end">
        <Button type="submit" disabled={submitting}>
          {submitting ? <Loader2 className="animate-spin" /> : <Plus />}
          {t.taxonomy.add}
        </Button>
      </div>
    </form>
  );
}
