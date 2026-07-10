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
import { LabelMultiSelect } from "./label-multi-select";
import {
  NO_ASSIGNEE,
  NO_SPRINT,
  type LabelOption,
  type Member,
  type PriorityOption,
  type SprintOption,
  type TicketTypeOption,
} from "./ticket-fields";

export interface EditableTicket {
  id: string;
  title: string;
  description: string | null;
  typeId: string;
  priorityId: string;
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
}: {
  ticket: EditableTicket;
  members: Member[];
  sprints: SprintOption[];
  labels: LabelOption[];
  types: TicketTypeOption[];
  priorities: PriorityOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState(ticket.title);
  const [description, setDescription] = useState(ticket.description ?? "");
  const [typeId, setTypeId] = useState<string>(ticket.typeId);
  const [priorityId, setPriorityId] = useState<string>(ticket.priorityId);
  const [assigneeId, setAssigneeId] = useState<string>(
    ticket.assigneeId ?? NO_ASSIGNEE,
  );
  const [sprintId, setSprintId] = useState<string>(
    ticket.sprintId ?? NO_SPRINT,
  );
  const [labelIds, setLabelIds] = useState<string[]>(ticket.labelIds);
  const [submitting, setSubmitting] = useState(false);

  function reset() {
    setTitle(ticket.title);
    setDescription(ticket.description ?? "");
    setTypeId(ticket.typeId);
    setPriorityId(ticket.priorityId);
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
      toast.error("Le titre est requis.");
      return;
    }
    setSubmitting(true);
    const result = await updateTicketAction({
      id: ticket.id,
      title: trimmed,
      description: description.trim() ? description.trim() : null,
      typeId,
      priorityId,
      assigneeId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
      sprintId: sprintId === NO_SPRINT ? null : sprintId,
      labelIds,
    });
    setSubmitting(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success("Ticket mis à jour.");
    router.refresh();
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Pencil />
          Éditer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Éditer le ticket</DialogTitle>
          <DialogDescription>
            Modifiez les champs puis enregistrez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-type">Type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger id="edit-type" aria-label="Type">
                  <SelectValue placeholder="Sélectionner…" />
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
              <Label htmlFor="edit-priority">Priorité</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger id="edit-priority" aria-label="Priorité">
                  <SelectValue placeholder="Sélectionner…" />
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
              <Label htmlFor="edit-assignee">Assigné à</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="edit-assignee" aria-label="Assigné à">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ASSIGNEE}>Personne</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name ?? m.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-sprint">Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger id="edit-sprint" aria-label="Sprint">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_SPRINT}>Backlog (aucun sprint)</SelectItem>
                  {sprints.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Labels</Label>
            <LabelMultiSelect
              labels={labels}
              selected={labelIds}
              onChange={setLabelIds}
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
