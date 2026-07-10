"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { FileText, Loader2, Paperclip, Plus, X } from "lucide-react";
import { Priority, TicketType } from "@prisma/client";
import { cn } from "@/lib/utils";
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
import { confirmAttachmentAction } from "@/server/actions/attachment.actions";
import { LabelMultiSelect } from "./label-multi-select";
import {
  formatBytes,
  NO_ASSIGNEE,
  NO_SPRINT,
  PRIORITY_OPTIONS,
  TICKET_TYPE_OPTIONS,
  type LabelOption,
  type Member,
  type SprintOption,
} from "./ticket-fields";

type PendingKind = "image" | "file" | "text";
interface PendingAttachment {
  id: string;
  file: File;
  kind: PendingKind;
  previewUrl?: string;
}

/** Récupère les fichiers image d'un presse-papier (via `files` puis `items`). */
function collectImages(data: DataTransfer): File[] {
  const images: File[] = [];
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) images.push(file);
  }
  if (images.length === 0) {
    for (const item of Array.from(data.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) images.push(file);
      }
    }
  }
  return images;
}

/**
 * Création rapide « paste-first » ⭐ — le titre suffit ; on peut coller une image
 * (aperçu + PJ en attente) ou un log/texte (PJ .txt ou insertion en description).
 * À la soumission, chaque PJ est presignée puis téléversée en S3 ; si le stockage
 * n'est pas configuré (501), le ticket est créé quand même sans pièce jointe.
 */
export function CreateTicketDialog({
  projectId,
  members,
  sprints,
  labels,
}: {
  projectId: string;
  members: Member[];
  sprints: SprintOption[];
  labels: LabelOption[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TicketType>(TicketType.TASK);
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [assigneeId, setAssigneeId] = useState<string>(NO_ASSIGNEE);
  const [sprintId, setSprintId] = useState<string>(NO_SPRINT);
  const [labelIds, setLabelIds] = useState<string[]>([]);
  const [pending, setPending] = useState<PendingAttachment[]>([]);
  const [pastedText, setPastedText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Révoque les object URLs des aperçus au démontage (via ref sur l'état courant).
  const pendingRef = useRef<PendingAttachment[]>([]);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  useEffect(
    () => () => {
      for (const p of pendingRef.current) {
        if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
      }
    },
    [],
  );

  function addImage(file: File) {
    const name = file.name?.trim() ? file.name : `image-${Date.now()}.png`;
    const named =
      file.name?.trim()
        ? file
        : new File([file], name, { type: file.type || "image/png" });
    const previewUrl = URL.createObjectURL(named);
    setPending((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file: named, kind: "image", previewUrl },
    ]);
  }

  /** Ajoute un fichier quelconque (image → aperçu ; sinon → document). */
  function addFile(file: File) {
    if (file.type.startsWith("image/")) {
      addImage(file);
      return;
    }
    setPending((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file, kind: "file" },
    ]);
  }

  function addFiles(files: File[] | FileList) {
    const arr = Array.from(files);
    if (arr.length === 0) return;
    arr.forEach(addFile);
    toast.success(
      arr.length > 1
        ? `${arr.length} pièces jointes ajoutées.`
        : "Pièce jointe ajoutée.",
    );
  }

  function handleDrop(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0) addFiles(event.dataTransfer.files);
  }

  function handleDragOver(event: React.DragEvent) {
    event.preventDefault();
    if (!dragging) setDragging(true);
  }

  function handleDragLeave(event: React.DragEvent) {
    event.preventDefault();
    setDragging(false);
  }

  function attachTextAsFile(text: string) {
    const file = new File([text], `collage-${Date.now()}.txt`, {
      type: "text/plain",
    });
    setPending((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file, kind: "text" },
    ]);
    setPastedText(null);
    toast.success("Texte ajouté en pièce jointe.");
  }

  function insertTextInDescription(text: string) {
    setDescription((prev) => (prev ? `${prev}\n${text}` : text));
    setPastedText(null);
    toast.success("Texte inséré dans la description.");
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  /** Zone de collage dédiée : image → PJ ; texte → propose PJ .txt / insertion. */
  function handleZonePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    const images = collectImages(event.clipboardData);
    if (images.length > 0) {
      event.preventDefault();
      images.forEach(addImage);
      toast.success(
        images.length > 1
          ? `${images.length} images ajoutées.`
          : "Image ajoutée en pièce jointe.",
      );
      return;
    }
    const text = event.clipboardData.getData("text/plain");
    if (text.trim().length > 0) {
      event.preventDefault();
      setPastedText(text);
    }
  }

  /** Description : n'intercepte que les images ; le texte se colle normalement. */
  function handleDescriptionPaste(
    event: React.ClipboardEvent<HTMLTextAreaElement>,
  ) {
    const images = collectImages(event.clipboardData);
    if (images.length > 0) {
      event.preventDefault();
      images.forEach(addImage);
      toast.success("Image ajoutée en pièce jointe.");
    }
  }

  function resetForm() {
    for (const p of pendingRef.current) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    }
    setTitle("");
    setDescription("");
    setType(TicketType.TASK);
    setPriority(Priority.MEDIUM);
    setAssigneeId(NO_ASSIGNEE);
    setSprintId(NO_SPRINT);
    setLabelIds([]);
    setPending([]);
    setPastedText(null);
  }

  function onOpenChange(next: boolean) {
    if (submitting) return;
    setOpen(next);
    if (!next) resetForm();
  }

  /** Téléverse les PJ en attente ; s'arrête proprement si le stockage manque (501). */
  async function uploadPending(ticketId: string) {
    for (const item of pending) {
      const contentType = item.file.type || "application/octet-stream";
      let presignRes: Response;
      try {
        presignRes = await fetch("/api/attachments/presign", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ticketId,
            filename: item.file.name,
            contentType,
            size: item.file.size,
          }),
        });
      } catch {
        toast.error(`Envoi de « ${item.file.name} » impossible.`);
        continue;
      }

      if (presignRes.status === 501) {
        toast.info("Stockage non configuré : ticket créé sans pièce jointe.");
        return;
      }
      if (!presignRes.ok) {
        toast.error(`Échec de préparation de « ${item.file.name} ».`);
        continue;
      }

      const { url, storageKey } = (await presignRes.json()) as {
        url: string;
        storageKey: string;
      };

      try {
        const put = await fetch(url, {
          method: "PUT",
          headers: { "Content-Type": contentType },
          body: item.file,
        });
        if (!put.ok) {
          toast.error(`Échec de l'envoi de « ${item.file.name} ».`);
          continue;
        }
      } catch {
        toast.error(`Échec de l'envoi de « ${item.file.name} ».`);
        continue;
      }

      const confirmed = await confirmAttachmentAction({
        ticketId,
        filename: item.file.name,
        contentType,
        size: item.file.size,
        storageKey,
      });
      if (!confirmed.ok) toast.error(confirmed.error);
    }
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
      type,
      priority,
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

    if (pending.length > 0) await uploadPending(created.id);

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
              onPaste={handleDescriptionPaste}
              placeholder="Détails (facultatif). Coller une image ici l'ajoute en pièce jointe."
              rows={4}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="ticket-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as TicketType)}
              >
                <SelectTrigger id="ticket-type" aria-label="Type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ticket-priority">Priorité</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as Priority)}
              >
                <SelectTrigger id="ticket-priority" aria-label="Priorité">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
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

          <div className="space-y-1.5">
            <Label htmlFor="ticket-paste">Pièces jointes</Label>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                "rounded-md border border-dashed p-3 transition-colors",
                dragging && "border-primary bg-primary/5",
              )}
            >
              <Textarea
                id="ticket-paste"
                value=""
                onChange={() => {}}
                onPaste={handleZonePaste}
                placeholder="Collez (Ctrl/Cmd + V) une image, un log ou du texte…"
                aria-label="Zone de collage de pièces jointes"
                className="min-h-12 resize-none border-0 bg-transparent p-0 text-muted-foreground shadow-none focus-visible:ring-0"
              />
              <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>…ou glissez-déposez vos documents ici.</span>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Paperclip />
                  Parcourir…
                </Button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="sr-only"
                aria-hidden
                tabIndex={-1}
                onChange={(e) => {
                  if (e.target.files) addFiles(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>

          {pastedText && (
            <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
              <p>
                Texte détecté ({pastedText.length}
                {" "}caractère{pastedText.length > 1 ? "s" : ""}).
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => attachTextAsFile(pastedText)}
                >
                  <FileText />
                  En pièce jointe (.txt)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => insertTextInDescription(pastedText)}
                >
                  Insérer dans la description
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => setPastedText(null)}
                >
                  Ignorer
                </Button>
              </div>
            </div>
          )}

          {pending.length > 0 && (
            <div className="space-y-1.5">
              <Label>
                Pièces jointes en attente ({pending.length})
              </Label>
              <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {pending.map((p) => (
                  <li
                    key={p.id}
                    className="relative flex items-center gap-2 rounded-md border p-2"
                  >
                    {p.kind === "image" && p.previewUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.previewUrl}
                        alt={p.file.name}
                        className="size-10 shrink-0 rounded object-cover"
                      />
                    ) : (
                      <FileText className="size-8 shrink-0 text-muted-foreground" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">
                        {p.file.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatBytes(p.file.size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removePending(p.id)}
                      aria-label={`Retirer ${p.file.name}`}
                      className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

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
