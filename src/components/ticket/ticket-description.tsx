"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Maximize2, Minimize2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { WikiContent } from "@/components/wiki/wiki-content";
import type { TicketRef } from "@/lib/wiki-mentions";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * Description d'un ticket : rendu MARKDOWN en lecture (mêmes capacités que le
 * wiki, citations « RKN-123 » comprises), édition au clic avec la barre d'outils
 * partagée.
 *
 * Deux contraintes ont façonné ce composant :
 *
 *  1. PAS D'ENREGISTREMENT AU BLUR. Contrairement à `InlineEdit`, la validation
 *     est explicite : cliquer « Gras » sort le curseur du champ, et enregistrer
 *     à la perte de focus refermerait l'éditeur au premier style demandé.
 *     ⌘/Ctrl + Entrée valide, Échap annule.
 *  2. LE RENDU CONTIENT DES LIENS. On ne peut donc pas envelopper la lecture
 *     dans un `<button>` (contenu interactif imbriqué : HTML invalide, et les
 *     liens deviendraient inatteignables). Le clic est capté sur un conteneur
 *     ordinaire qui ignore les clics visant un élément interactif, et un vrai
 *     bouton « Modifier » assure l'accès au clavier.
 */

/** Hauteurs du champ, en lignes : confortable par défaut, généreuse une fois agrandi. */
const ROWS_DEFAULT = 10;
const ROWS_EXPANDED = 28;

export function TicketDescription({
  ticketId,
  value,
  projectKey,
  tickets,
  canEdit,
}: {
  ticketId: string;
  value: string | null;
  projectKey: string;
  /** Tickets du projet : citations « @ » et résolution des liens en lecture. */
  tickets: TicketRef[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useDict();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value ?? "");

  // Réalignement sur la valeur serveur après rafraîchissement, jamais pendant
  // une saisie (on écraserait le brouillon en cours).
  const canonical = value ?? "";
  if (canonical !== syncedValue && !editing && !pending) {
    setSyncedValue(canonical);
    setDraft(canonical);
  }

  const ticketMap: Record<string, string> = Object.fromEntries(
    tickets.map((ticket) => [ticket.key.toUpperCase(), ticket.id]),
  );

  const editAria = fmt(t.common.inline.editAria, {
    field: t.ticketForm.descriptionLabel,
  });

  async function save() {
    const next = draft.trim();
    if (next === canonical.trim()) {
      setEditing(false);
      return;
    }
    setPending(true);
    const res = await updateTicketAction({
      id: ticketId,
      // Une description vidée redevient `null`, comme dans le dialogue.
      description: next ? next : null,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error); // on reste en édition : la saisie n'est pas perdue
      return;
    }
    setSyncedValue(next);
    setEditing(false);
    toast.success(t.common.inline.saved);
    router.refresh();
  }

  function cancel() {
    setDraft(canonical);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="space-y-3">
        <MarkdownEditor
          id={`ticket-description-${ticketId}`}
          value={draft}
          onChange={setDraft}
          tickets={tickets}
          projectKey={projectKey}
          ticketMap={ticketMap}
          placeholder={t.ticketDetail.descriptionPlaceholder}
          rows={expanded ? ROWS_EXPANDED : ROWS_DEFAULT}
          disabled={pending}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              cancel();
              return;
            }
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void save();
            }
          }}
          toolbarExtra={
            // Agrandissement explicite, EN PLUS de la poignée native du champ :
            // la poignée demande de viser 6 pixels, ce bouton non.
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setExpanded((v) => !v)}
              aria-pressed={expanded}
            >
              {expanded ? <Minimize2 /> : <Maximize2 />}
              {expanded ? t.common.collapse : t.common.expand}
            </Button>
          }
        />
        <div className="flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
            {t.common.cancel}
          </Button>
          <Button type="button" onClick={() => void save()} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    );
  }

  const body = draft.trim() ? (
    <WikiContent content={draft} projectKey={projectKey} ticketMap={ticketMap} />
  ) : (
    <p className="text-sm text-muted-foreground">{t.ticketDetail.noDescription}</p>
  );

  if (!canEdit) return body;

  return (
    <div className="group/desc relative">
      {/* Bouton d'édition : c'est LUI qui porte l'accès clavier. Masqué
          visuellement pour ne pas creuser un vide au-dessus du texte, il
          réapparaît dès qu'il reçoit le focus - le parcours au clavier reste
          donc complet, sans coût pour la lecture à la souris. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setEditing(true)}
        aria-label={editAria}
        className="sr-only focus:not-sr-only focus:absolute focus:right-0 focus:top-0 focus:z-10"
      >
        <Pencil />
        {t.common.edit}
      </Button>
      <div
        role="presentation"
        onClick={(event) => {
          // Un clic sur un lien, un bouton ou une case à cocher du Markdown rendu
          // doit garder son sens : on n'entre en édition que sur du texte inerte.
          if ((event.target as HTMLElement).closest("a, button, input, textarea")) {
            return;
          }
          setEditing(true);
        }}
        className="-mx-2 cursor-text rounded-md px-2 py-1 transition-colors hover:bg-muted/50"
      >
        {body}
      </div>
      {/* Crayon d'affordance, révélé au survol comme ailleurs dans l'application. */}
      <Pencil
        className="pointer-events-none absolute right-0 top-1 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover/desc:opacity-100"
        aria-hidden
      />
    </div>
  );
}
