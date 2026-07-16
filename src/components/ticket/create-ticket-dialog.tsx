"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { createTicketAction } from "@/server/actions/ticket.actions";
import { AttachmentField, usePendingAttachments } from "./attachment-field";
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

/**
 * Création rapide « paste-first » - le titre suffit ; on peut coller une image
 * (aperçu + PJ en attente) ou un log/texte (PJ .txt ou insertion en description).
 * À la soumission, les PJ sont téléversées **en parallèle** (S3 ou disque local selon
 * la configuration) ; un échec d'envoi n'empêche pas la création du ticket.
 */
export function CreateTicketDialog({
  projectId,
  members,
  sprints,
  labels,
  types,
  priorities,
}: {
  projectId: string;
  members: Member[];
  sprints: SprintOption[];
  labels: LabelOption[];
  types: TicketTypeOption[];
  priorities: PriorityOption[];
}) {
  const router = useRouter();
  const attachments = usePendingAttachments();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [typeId, setTypeId] = useState<string>(types[0]?.id ?? "");
  const [priorityId, setPriorityId] = useState<string>(priorities[0]?.id ?? "");
  const [assigneeId, setAssigneeId] = useState<string>(NO_ASSIGNEE);
  const [sprintId, setSprintId] = useState<string>(NO_SPRINT);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function resetForm() {
    attachments.clear();
    setTitle("");
    setDescription("");
    setTypeId(types[0]?.id ?? "");
    setPriorityId(priorities[0]?.id ?? "");
    setAssigneeId(NO_ASSIGNEE);
    setSprintId(NO_SPRINT);
    setLabelIds([]);
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) resetForm();
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Le titre est requis.");
      return;
    }

    setSubmitting(true);
    const result = await createTicketAction({
      projectId,
      title: trimmed,
      description: description.trim() ? description.trim() : undefined,
      typeId: typeId || undefined,
      priorityId: priorityId || undefined,
      assigneeId: assigneeId === NO_ASSIGNEE ? null : assigneeId,
      sprintId: sprintId === NO_SPRINT ? null : sprintId,
      labelIds,
    });

    if (!result.ok) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }
    const created = result.data;
    if (!created) {
      toast.error("Réponse inattendue du serveur.");
      setSubmitting(false);
      return;
    }

    if (attachments.hasPending) await attachments.uploadAll(created.id);

    toast.success(`Ticket ${created.key} créé.`);
    router.refresh();
    setSubmitting(false);
    setOpen(false);
    resetForm();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button>
          <Plus />
          Nouveau ticket
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nouveau ticket</DialogTitle>
          <DialogDescription>
            Un titre suffit. Collez une capture ou un log directement : ils
            deviennent des pièces jointes.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ticket-title">
              Titre <span className="text-destructive">*</span>
            </Label>
            <Input
              id="ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Résumé court du ticket"
              autoFocus
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ticket-description">Description</Label>
            <Textarea
              id="ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onPaste={(e) => attachments.pasteImages(e)}
              placeholder="Détails (facultatif). Coller une image ici l'ajoute en pièce jointe."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-type">Type</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger id="ticket-type" aria-label="Type">
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
              <Label htmlFor="ticket-priority">Priorité</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger id="ticket-priority" aria-label="Priorité">
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
              <Label htmlFor="ticket-assignee">Assigné à</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger id="ticket-assignee" aria-label="Assigné à">
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
              <Label htmlFor="ticket-sprint">Sprint</Label>
              <Select value={sprintId} onValueChange={setSprintId}>
                <SelectTrigger id="ticket-sprint" aria-label="Sprint">
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

          <AttachmentField
            attachments={attachments}
            id="ticket-paste"
            onInsertText={(text) =>
              setDescription((prev) => (prev ? `${prev}\n${text}` : text))
            }
          />

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={submitting}>
                Annuler
              </Button>
            </DialogClose>
            <Button type="submit" disabled={submitting}>
              {submitting && <Loader2 className="animate-spin" />}
              Créer le ticket
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
