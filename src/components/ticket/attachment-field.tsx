"use client";

import {
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type DragEvent,
} from "react";
import { toast } from "sonner";
import { FileText, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatBytes } from "./ticket-fields";
import {
  collectImages,
  uploadFilesToTicket,
  type PendingAttachment,
} from "./attachment-upload";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * Gestion des pièces jointes « en attente » (avant enregistrement du ticket) -
 * partagée par les dialogues de création ET d'édition. Capture d'images du
 * presse-papier, aperçus, et téléversement en parallèle à la sauvegarde.
 */
export function usePendingAttachments() {
  const t = useDict();
  const [pending, setPending] = useState<PendingAttachment[]>([]);

  // Ref sur l'état courant pour révoquer les object URLs au démontage / au nettoyage.
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
    const named = file.name?.trim()
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
        ? fmt(t.ticketForm.attachmentsAddedOther, { count: arr.length })
        : t.ticketForm.attachmentsAddedOne,
    );
  }

  function addText(text: string) {
    const file = new File([text], `collage-${Date.now()}.txt`, {
      type: "text/plain",
    });
    setPending((prev) => [
      ...prev,
      { id: crypto.randomUUID(), file, kind: "text" },
    ]);
    toast.success(t.ticketForm.textAttached);
  }

  /** Colle les images du presse-papier ; renvoie `true` si des images ont été captées. */
  function pasteImages(event: ClipboardEvent): boolean {
    const images = collectImages(event.clipboardData);
    if (images.length === 0) return false;
    event.preventDefault();
    images.forEach(addImage);
    toast.success(
      images.length > 1
        ? fmt(t.ticketForm.imagesAddedOther, { count: images.length })
        : t.ticketForm.imagesAddedOne,
    );
    return true;
  }

  function removePending(id: string) {
    setPending((prev) => {
      const target = prev.find((p) => p.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.id !== id);
    });
  }

  function clear() {
    for (const p of pendingRef.current) {
      if (p.previewUrl) URL.revokeObjectURL(p.previewUrl);
    }
    setPending([]);
  }

  /** Téléverse toutes les PJ en attente sur le ticket (parallèle). */
  async function uploadAll(ticketId: string) {
    await uploadFilesToTicket(
      ticketId,
      pendingRef.current.map((p) => p.file),
    );
  }

  return {
    pending,
    hasPending: pending.length > 0,
    addImage,
    addFile,
    addFiles,
    addText,
    pasteImages,
    removePending,
    clear,
    uploadAll,
  };
}

export type PendingAttachmentsApi = ReturnType<typeof usePendingAttachments>;

/**
 * Champ « Pièces jointes » - zone de collage (image/log/texte) + glisser-déposer
 * + Parcourir, avec aperçu des pièces en attente. `onInsertText` permet, quand du
 * texte est collé, de l'insérer dans la description plutôt qu'en pièce jointe.
 */
export function AttachmentField({
  attachments,
  onInsertText,
  id = "attachment-paste",
}: {
  attachments: PendingAttachmentsApi;
  onInsertText?: (text: string) => void;
  id?: string;
}) {
  const t = useDict();
  const [dragging, setDragging] = useState(false);
  const [pastedText, setPastedText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleZonePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    if (attachments.pasteImages(event)) return;
    const text = event.clipboardData.getData("text/plain");
    if (text.trim().length > 0) {
      event.preventDefault();
      setPastedText(text);
    }
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 0)
      attachments.addFiles(event.dataTransfer.files);
  }
  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    if (!dragging) setDragging(true);
  }
  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{t.ticketForm.attachmentsLabel}</Label>
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
          id={id}
          value=""
          onChange={() => {}}
          onPaste={handleZonePaste}
          placeholder={t.ticketForm.pastePlaceholder}
          aria-label={t.ticketForm.pasteZoneAria}
          className="min-h-12 resize-none border-0 bg-transparent p-0 text-muted-foreground shadow-none focus-visible:ring-0"
        />
        <div className="mt-1 flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span>{t.ticketForm.dropHint}</span>
          <Button
            type="button"
            size="sm"
            variant="secondary"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip />
            {t.ticketForm.browse}
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
            if (e.target.files) attachments.addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {pastedText && (
        <div className="space-y-2 rounded-md border bg-muted/40 p-3 text-sm">
          <p>
            {fmt(
              pastedText.length > 1
                ? t.ticketForm.textDetectedOther
                : t.ticketForm.textDetectedOne,
              { count: pastedText.length },
            )}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => {
                attachments.addText(pastedText);
                setPastedText(null);
              }}
            >
              <FileText />
              {t.ticketForm.attachAsTxt}
            </Button>
            {onInsertText && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                onClick={() => {
                  onInsertText(pastedText);
                  setPastedText(null);
                }}
              >
                {t.ticketForm.insertIntoDescription}
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setPastedText(null)}
            >
              {t.ticketForm.ignore}
            </Button>
          </div>
        </div>
      )}

      {attachments.hasPending && (
        <div className="space-y-1.5">
          <Label>{fmt(t.ticketForm.pendingAttachments, { count: attachments.pending.length })}</Label>
          <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {attachments.pending.map((p) => (
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
                  <p className="truncate text-xs font-medium">{p.file.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(p.file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => attachments.removePending(p.id)}
                  aria-label={fmt(t.ticketForm.removeAttachment, { name: p.file.name })}
                  className="rounded-sm p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
