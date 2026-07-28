"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { AttachmentField, usePendingAttachments } from "./attachment-field";
import { LabelMultiSelect } from "./label-multi-select";
import { ComponentSelect } from "./component-select";
import { ModuleSelect } from "./module-select";
import {
  NO_ASSIGNEE,
  NO_COMPONENT,
  NO_MODULE,
  NO_SPRINT,
  type ComponentOption,
  type ModuleOption,
  type LabelOption,
  type Member,
  type PriorityOption,
  type SprintOption,
  type TicketTypeOption,
} from "./ticket-fields";
import { useDict } from "@/i18n/provider";

export interface EditableTicket {
  id: string;
  title: string;
  description: string | null;
  typeId: string;
  priorityId: string;
  /** Composant concerné, ou `null` si la demande n'en cible aucun. */
  componentId: string | null;
  /** Module PROPRE du ticket : renseigné seulement s'il n'a pas de composant. */
  moduleId: string | null;
  assigneeId: string | null;
  sprintId: string | null;
  labelIds: string[];
}

/** Édition d'un ticket (Admin partout ; Rapporteur sur ses tickets). */
export function EditTicketDialog({
  ticket,
  members,
  sprints,
  labels,
  types,
  priorities,
  components,
  modules,
}: {
  ticket: EditableTicket;
  members: Member[];
  sprints: SprintOption[];
  labels: LabelOption[];
  types: TicketTypeOption[];
  priorities: PriorityOption[];
  /** Catalogue du projet ; vide = le champ « Composant » n'est pas rendu. */
  components: ComponentOption[];
  /** Modules du projet ; vide = le champ « Module » n'est pas rendu. */
  modules: ModuleOption[];
}) {
  const router = useRouter();
  const t = useDict();
  const attachments = usePendingAttachments();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? "");
  const [typeId, setTypeId] = useState<string>(ticket.typeId);
  const [priorityId, setPriorityId] = useState<string>(ticket.priorityId);
  const [componentId, setComponentId] = useState<string>(
    ticket.componentId ?? NO_COMPONENT,
  );
  const [moduleId, setModuleId] = useState<string>(
    ticket.moduleId ?? NO_MODULE,
  );
  const [assigneeId, setAssigneeId] = useState<string>(
    ticket.assigneeId ?? NO_ASSIGNEE,
  );
  const [sprintId, setSprintId] = useState<string>(
    ticket.sprintId ?? NO_SPRINT,
  );
  const [labelIds, setLabelIds] = useState<string[]>(ticket.labelIds);
  const [submitting, setSubmitting] = useState(false);

  // Module : dérivé du composant dès qu'il y en a un (invariant serveur), et
  // saisissable seulement pour une demande à grosse maille, sans composant.
  const componentModule =
    components.find((c) => c.id === componentId)?.module ?? null;
  const componentChosen = componentId !== NO_COMPONENT;
  const displayedModuleId = componentChosen
    ? (componentModule?.id ?? NO_MODULE)
    : moduleId;

  function reset() {
    attachments.clear();
    setTitle(ticket.title);
    setDescription(ticket.description ?? "");
    setTypeId(ticket.typeId);
    setPriorityId(ticket.priorityId);
    setComponentId(ticket.componentId ?? NO_COMPONENT);
    setModuleId(ticket.moduleId ?? NO_MODULE);
    setAssigneeId(ticket.assigneeId ?? NO_ASSIGNEE);
    setSprintId(ticket.sprintId ?? NO_SPRINT);
    setLabelIds(ticket.labelIds);
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) reset();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t.ticketForm.titleRequired);
      return;
    }
    setSubmitting(true);
    const result = await updateTicketAction({
      id: ticket.id,
      title: trimmed,
      description: description.trim() ? description.trim() : null,
      typeId,
      priorityId,
      componentId: componentId === NO_COMPONENT ? null : componentId,
      // Le serveur impose de toute façon l'invariant ; on lui envoie déjà l'état
      // cohérent pour que la charge utile reflète ce que l'écran montrait.
      moduleId:
        componentId === NO_COMPONENT && moduleId !== NO_MODULE ? moduleId : null,
      assigneeId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
      sprintId: sprintId === NO_SPRINT ? null : sprintId,
      labelIds,
    });
    if (!result.ok) {
      setSubmitting(false);
      toast.error(result.error);
      return;
    }
    // PJ collées/déposées pendant l'édition → téléversées sur le ticket existant.
    if (attachments.hasPending) await attachments.uploadAll(ticket.id);
    attachments.clear();
    setSubmitting(false);
    toast.success(t.ticketForm.updatedToast);
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil />
          {t.ticketForm.edit}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.ticketForm.editTitle}</DialogTitle>
          <DialogDescription>{t.ticketForm.editDescription}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">
              {t.ticketForm.titleLabel} <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">{t.ticketForm.descriptionLabel}</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={(e) => attachments.pasteImages(e)}
              placeholder={t.ticketForm.descriptionPlaceholderEdit}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-type">{t.ticketForm.typeLabel}</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger id="edit-type" aria-label={t.ticketForm.typeLabel}>
                  <SelectValue placeholder={t.ticketForm.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {types.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: o.color }}
                          aria-hidden
                        />
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-priority">{t.ticketForm.priorityLabel}</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger id="edit-priority" aria-label={t.ticketForm.priorityLabel}>
                  <SelectValue placeholder={t.ticketForm.selectPlaceholder} />
                </SelectTrigger>
                <SelectContent>
                  {priorities.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="size-2 shrink-0 rounded-full"
                          style={{ backgroundColor: o.color }}
                          aria-hidden
                        />
                        {o.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-assignee">{t.ticketForm.assigneeLabel}</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="edit-assignee" aria-label={t.ticketForm.assigneeLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>{t.ticketForm.noAssignee}</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sprint">{t.ticketForm.sprintLabel}</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger id="edit-sprint" aria-label={t.ticketForm.sprintLabel}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SPRINT}>{t.ticketForm.backlogOption}</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ComponentSelect
              id="edit-component"
              components={components}
              value={componentId}
              onChange={setComponentId}
              label={t.ticketForm.componentLabel}
              emptyValue={NO_COMPONENT}
              emptyLabel={t.ticketForm.noComponent}
            />

            <ModuleSelect
              id="edit-module"
              modules={modules}
              value={displayedModuleId}
              onChange={setModuleId}
              label={t.ticketForm.moduleLabel}
              emptyValue={NO_MODULE}
              emptyLabel={t.ticketForm.noModule}
              disabled={componentChosen}
              description={
                componentChosen ? t.ticketForm.moduleFromComponent : undefined
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label>{t.ticketForm.labelsLabel}</Label>
            <LabelMultiSelect
              labels={labels}
              selected={labelIds}
              onChange={setLabelIds}
            />
          </div>

          <AttachmentField
            attachments={attachments}
            id="edit-paste"
            onInsertText={(text) =>
              setDescription((prev) => (prev ? `${prev}\n${text}` : text))
            }
          />

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
