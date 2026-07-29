"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { ComponentKind } from "@prisma/client";
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
import { ModuleSelect } from "@/components/ticket/module-select";
import {
  COMPONENT_KIND_ICONS,
  NO_MODULE,
  type ModuleOption,
} from "@/components/ticket/ticket-fields";
import { proposeModuleAction } from "@/server/actions/module.actions";
import { proposeComponentAction } from "@/server/actions/component.actions";
import { useDict } from "@/i18n/provider";

/**
 * Dialogues de PROPOSITION, ouverts à tout membre du projet (rapporteurs
 * compris). Ce qui est soumis ici n'est utilisable nulle part tant qu'un
 * administrateur ne l'a pas validé : ni dans les sélecteurs de ticket, ni dans
 * le contexte transmis à l'IA, ni via MCP.
 *
 * La COULEUR n'est volontairement pas demandée : c'est un choix de présentation
 * qui relève de l'administrateur, et l'exiger d'un rapporteur alourdirait la
 * proposition sans rien y apporter. Une teinte neutre est appliquée par défaut,
 * l'admin l'ajuste après validation.
 */

/** Teintes par défaut d'une proposition, ajustables ensuite dans les réglages. */
const DEFAULT_MODULE_COLOR = "#64748B";
const DEFAULT_COMPONENT_COLOR = "#64748B";

const KINDS: ComponentKind[] = [
  ComponentKind.PAGE,
  ComponentKind.SHARED,
  ComponentKind.SERVICE,
];

/** Proposer un nouveau MODULE fonctionnel. */
export function ProposeModuleDialog({ projectId }: { projectId: string }) {
  const router = useRouter();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await proposeModuleAction({
      projectId,
      name,
      description: String(data.get("description") ?? "").trim(),
      color: DEFAULT_MODULE_COLOR,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.structure.proposalSent);
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          {t.structure.proposeModule}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.structure.proposeModuleTitle}</DialogTitle>
          <DialogDescription>
            {t.structure.proposeModuleDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="propose-module-name">{t.taxonomy.name}</Label>
            <Input
              id="propose-module-name"
              name="name"
              maxLength={60}
              placeholder={t.taxonomy.modules.newPlaceholder}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propose-module-description">
              {t.taxonomy.modules.descriptionLabel}
            </Label>
            <Textarea
              id="propose-module-description"
              name="description"
              rows={3}
              maxLength={500}
              placeholder={t.taxonomy.modules.descriptionPlaceholder}
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
              {t.structure.submitProposal}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Proposer un nouveau COMPOSANT applicatif. */
export function ProposeComponentDialog({
  projectId,
  modules,
}: {
  projectId: string;
  /** Modules VALIDÉS auxquels rattacher la proposition (facultatif). */
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [kind, setKind] = useState<ComponentKind>(ComponentKind.PAGE);
  const [moduleId, setModuleId] = useState<string>(NO_MODULE);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    if (!name) {
      toast.error(t.taxonomy.nameRequired);
      return;
    }

    setSubmitting(true);
    const res = await proposeComponentAction({
      projectId,
      name,
      kind,
      moduleId: moduleId === NO_MODULE ? null : moduleId,
      description: String(data.get("description") ?? "").trim(),
      color: DEFAULT_COMPONENT_COLOR,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.structure.proposalSent);
    setOpen(false);
    setKind(ComponentKind.PAGE);
    setModuleId(NO_MODULE);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Plus />
          {t.structure.proposeComponent}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.structure.proposeComponentTitle}</DialogTitle>
          <DialogDescription>
            {t.structure.proposeComponentDescription}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="propose-component-name">{t.taxonomy.name}</Label>
            <Input
              id="propose-component-name"
              name="name"
              maxLength={60}
              placeholder={t.taxonomy.components.newPlaceholder}
              autoFocus
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="propose-component-kind">
              {t.taxonomy.components.kindLabel}
            </Label>
            <Select
              value={kind}
              onValueChange={(v) => setKind(v as ComponentKind)}
            >
              <SelectTrigger
                id="propose-component-kind"
                aria-label={t.taxonomy.components.kindAria}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {KINDS.map((k) => {
                  const Icon = COMPONENT_KIND_ICONS[k];
                  return (
                    <SelectItem key={k} value={k}>
                      <span className="flex items-center gap-2">
                        <Icon className="size-3.5 shrink-0" aria-hidden />
                        {t.taxonomy.componentKinds[k]}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <ModuleSelect
            id="propose-component-module"
            modules={modules}
            value={moduleId}
            onChange={setModuleId}
            label={t.taxonomy.components.moduleLabel}
            ariaLabel={t.taxonomy.components.moduleAria}
            emptyValue={NO_MODULE}
            emptyLabel={t.taxonomy.modules.noModule}
          />
          <div className="grid gap-2">
            <Label htmlFor="propose-component-description">
              {t.taxonomy.components.descriptionLabel}
            </Label>
            <Textarea
              id="propose-component-description"
              name="description"
              rows={3}
              maxLength={500}
              placeholder={t.taxonomy.components.descriptionPlaceholder}
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
              {t.structure.submitProposal}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
