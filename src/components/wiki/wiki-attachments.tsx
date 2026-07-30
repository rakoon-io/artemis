"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Download, ImageIcon, Loader2, Paperclip, Plus, X } from "lucide-react";
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
import { deleteWikiAttachmentAction } from "@/server/actions/wiki-attachment.actions";
import { uploadWikiFile, wikiFileHref } from "./wiki-file-upload";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * PIÈCES JOINTES d'une page de wiki : documents déposés, et images collées dans
 * le texte - les deux vivent au même endroit.
 *
 * Une image collée apparaît donc ici EN PLUS d'être dans le texte, et c'est
 * voulu : c'est la seule façon de la retrouver pour la supprimer, ou de voir ce
 * qu'une page traîne réellement derrière elle.
 *
 * Le panneau ne paraît que s'il y a quelque chose à montrer, ou de quoi déposer :
 * une carte « aucune pièce jointe » sur chaque page serait un reproche permanent.
 */

export interface WikiFile {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

/** Taille lisible : les octets d'un document ne disent rien à personne. */
function readableSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export function WikiAttachments({
  pageId,
  files,
  canEdit,
}: {
  pageId: string;
  files: WikiFile[];
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  if (files.length === 0 && !canEdit) return null;

  async function add(list: FileList | null) {
    if (!list || list.length === 0) return;
    setUploading(true);
    let ok = 0;
    for (const file of Array.from(list)) {
      const done = await uploadWikiFile(pageId, file);
      if (done) ok += 1;
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    if (ok === 0) {
      toast.error(t.wiki.files.uploadFailed);
      return;
    }
    toast.success(t.wiki.files.uploaded);
    router.refresh();
  }

  return (
    <section className="space-y-2 border-t pt-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <Paperclip className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          {t.wiki.files.title}
        </p>
        {canEdit && (
          <>
            <input
              ref={inputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(event) => void add(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
            >
              {uploading ? <Loader2 className="animate-spin" /> : <Plus />}
              {uploading ? t.wiki.files.uploading : t.wiki.files.add}
            </Button>
          </>
        )}
      </div>

      {files.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t.wiki.files.pasteHint}</p>
      ) : (
        <ul className="space-y-1">
          {files.map((file) => (
            <li key={file.id} className="group/file flex items-center gap-2">
              {file.contentType.startsWith("image/") ? (
                <ImageIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              ) : (
                <Download className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              )}
              <a
                href={wikiFileHref(file.id)}
                target="_blank"
                rel="noopener noreferrer"
                className="min-w-0 flex-1 truncate text-sm hover:underline"
              >
                {file.filename}
              </a>
              <span className="shrink-0 text-xs text-muted-foreground">
                {readableSize(file.size)}
              </span>
              {canEdit && (
                <RemoveFile
                  file={file}
                  onDone={() => router.refresh()}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * Retrait d'une pièce jointe, avec confirmation.
 *
 * Le CONTENU de la page n'est pas touché : si le texte cite le fichier, la
 * citation reste et ne mène plus nulle part. C'est dit dans le dialogue.
 * Réécrire le texte de quelqu'un d'autre sur une supposition ferait plus de
 * dégâts qu'un lien mort qu'on voit.
 */
function RemoveFile({ file, onDone }: { file: WikiFile; onDone: () => void }) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function remove() {
    setPending(true);
    const res = await deleteWikiAttachmentAction(file.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.files.removed);
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/file:opacity-100 pointer-coarse:opacity-100"
          title={fmt(t.wiki.files.remove, { name: file.filename })}
          aria-label={fmt(t.wiki.files.remove, { name: file.filename })}
        >
          <X />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fmt(t.wiki.files.removeTitle, { name: file.filename })}
          </DialogTitle>
          <DialogDescription>
            {t.wiki.files.removeDescription}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => void remove()}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
