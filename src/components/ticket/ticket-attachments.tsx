"use client";

import { useRef, useState, type DragEvent as ReactDragEvent } from "react";
import { useRouter } from "next/navigation";
import { Download, Loader2, Paperclip, X } from "lucide-react";
import { toast } from "sonner";
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
import { useStrayFileDropGuard } from "@/components/file-drop-guard";
import { formatBytes } from "@/components/ticket/ticket-fields";
import {
  collectImages,
  uploadFilesToTicket,
} from "@/components/ticket/attachment-upload";
import { deleteAttachmentAction } from "@/server/actions/attachment.actions";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * PIÈCES JOINTES d'un ticket : les voir, en déposer, en retirer - sur la fiche.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'IL REMPLACE
 *
 * La fiche LISTAIT les pièces jointes sans jamais permettre d'en ajouter une :
 * pour joindre un fichier à un ticket existant, il fallait ouvrir « Éditer le
 * ticket », une modale portant les dix champs du ticket. C'était la SEULE chose
 * que cette modale savait faire et que la fiche ne savait pas - tout le reste y
 * était déjà modifiable sur place, et deux champs de plus encore (le statut et
 * la version) n'y figuraient même pas.
 *
 * Une modale de dix champs pour déposer un fichier, c'est faire relire à
 * l'utilisateur tout le ticket pour changer une chose. Le dépôt vient donc là où
 * les pièces jointes se lisent, et la modale disparaît.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DÉPÔT IMMÉDIAT, SANS BOUTON « ENREGISTRER »
 *
 * Le fichier part dès qu'il est lâché ou collé. C'est le contraire de la modale,
 * qui gardait les fichiers en attente jusqu'à la validation du formulaire :
 * ici il n'y a pas de formulaire à valider, donc rien à quoi rattacher une
 * attente. Le même parti que l'édition en place des autres champs, et que les
 * pièces jointes du wiki.
 */

export interface TicketAttachment {
  id: string;
  filename: string;
  contentType: string;
  size: number;
}

export function TicketAttachments({
  ticketId,
  attachments,
  canEdit,
}: {
  ticketId: string;
  attachments: TicketAttachment[];
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [over, setOver] = useState(false);
  /**
   * `dragenter` et `dragleave` se déclenchent AUSSI en entrant et sortant des
   * éléments enfants. Un simple booléen clignoterait dès que le curseur passe
   * au-dessus du texte de la zone : on compte les entrées et les sorties.
   */
  const depth = useRef(0);

  useStrayFileDropGuard(canEdit);

  const images = attachments.filter((a) => a.contentType.startsWith("image/"));
  const fichiers = attachments.filter(
    (a) => !a.contentType.startsWith("image/"),
  );

  async function ajouter(files: File[]) {
    if (files.length === 0) return;
    setUploading(true);
    await uploadFilesToTicket(ticketId, files);
    setUploading(false);
    if (inputRef.current) inputRef.current.value = "";
    toast.success(t.ticketDetail.attachmentUploaded);
    router.refresh();
  }

  const carriesFiles = (event: ReactDragEvent<HTMLElement>) =>
    Array.from(event.dataTransfer.types).includes("Files");

  return (
    <div className="space-y-3">
      {attachments.length > 0 ? (
        <div className="space-y-3">
          {images.length > 0 && (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((att) => (
                <li key={att.id} className="group/att relative">
                  <a
                    href={`/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noreferrer"
                    title={`${att.filename} (${formatBytes(att.size)})`}
                    className="block overflow-hidden rounded-md border transition-colors hover:border-primary/50"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/attachments/${att.id}`}
                      alt={att.filename}
                      loading="lazy"
                      className="aspect-square w-full bg-muted object-cover transition-transform group-hover/att:scale-105"
                    />
                  </a>
                  {canEdit && (
                    <RetirerPiece
                      attachment={att}
                      onDone={() => router.refresh()}
                      className="absolute right-1 top-1 bg-background/80 backdrop-blur"
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
          {fichiers.length > 0 && (
            <ul className="space-y-2">
              {fichiers.map((att) => (
                <li key={att.id} className="group/att flex items-center gap-1">
                  <a
                    href={`/api/attachments/${att.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md border p-2 text-sm transition-colors hover:bg-muted/50"
                  >
                    <Download className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {att.filename}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatBytes(att.size)}
                    </span>
                  </a>
                  {canEdit && (
                    <RetirerPiece
                      attachment={att}
                      onDone={() => router.refresh()}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        !canEdit && (
          <p className="text-sm text-muted-foreground">
            {t.ticketDetail.noAttachments}
          </p>
        )
      )}

      {canEdit && (
        <div
          /**
           * Le cadre pointillé est là EN PERMANENCE : n'apparaître qu'au survol
           * d'un fichier, c'est n'exister que pour qui sait déjà qu'il peut
           * déposer. Le bouton reste dedans - c'est lui qui porte l'accès au
           * clavier, un rectangle qu'on clique n'en ayant aucun.
           */
          onDragEnter={(event) => {
            if (!carriesFiles(event)) return;
            depth.current += 1;
            setOver(true);
          }}
          onDragOver={(event) => {
            // Sans cela, le dépôt est refusé et le navigateur ouvre le fichier.
            if (carriesFiles(event)) event.preventDefault();
          }}
          onDragLeave={(event) => {
            if (!carriesFiles(event)) return;
            depth.current = Math.max(0, depth.current - 1);
            if (depth.current === 0) setOver(false);
          }}
          onDrop={(event) => {
            if (!carriesFiles(event)) return;
            event.preventDefault();
            depth.current = 0;
            setOver(false);
            void ajouter(Array.from(event.dataTransfer.files));
          }}
          // Coller une capture d'écran est le geste le plus fréquent sur un
          // ticket - avant même le glisser-déposer.
          onPaste={(event) => {
            const collees = collectImages(event.clipboardData);
            if (collees.length === 0) return;
            event.preventDefault();
            void ajouter(collees);
          }}
          tabIndex={-1}
          className={cn(
            "flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground transition-colors",
            over && "border-primary bg-primary/5",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(event) =>
              void ajouter(Array.from(event.target.files ?? []))
            }
          />
          <span>
            {uploading
              ? t.ticketDetail.attachmentUploading
              : t.ticketDetail.attachmentDropHint}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
            {t.ticketDetail.attachmentBrowse}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Retrait d'une pièce jointe, avec confirmation.
 *
 * La confirmation n'est pas une politesse : depuis ce correctif, la suppression
 * efface AUSSI l'objet stocké (cf. `forgetObjects`). Il n'y a donc plus de
 * fichier à retrouver dans le seau après coup.
 *
 * La description du ticket n'est PAS réécrite. Si elle cite l'image, la citation
 * restera visible et ne mènera plus nulle part - c'est le choix déjà fait pour
 * le wiki : réécrire le texte de quelqu'un d'autre sur une supposition ferait
 * plus de dégâts qu'un lien mort qu'on voit.
 */
function RetirerPiece({
  attachment,
  onDone,
  className,
}: {
  attachment: TicketAttachment;
  onDone: () => void;
  className?: string;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function retirer() {
    setPending(true);
    const res = await deleteAttachmentAction(attachment.id);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.ticketDetail.attachmentRemoved);
    setOpen(false);
    onDone();
  }

  const libelle = fmt(t.ticketDetail.attachmentRemove, {
    name: attachment.filename,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          // Invisible au repos, révélé au survol de la ligne - et TOUJOURS
          // visible sur écran tactile, où il n'y a pas de survol.
          className={cn(
            "size-7 shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover/att:opacity-100 pointer-coarse:opacity-100",
            className,
          )}
          title={libelle}
          aria-label={libelle}
        >
          <X />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {fmt(t.ticketDetail.attachmentRemoveTitle, {
              name: attachment.filename,
            })}
          </DialogTitle>
          <DialogDescription>
            {t.ticketDetail.attachmentRemoveDescription}
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
            onClick={() => void retirer()}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.delete}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
