"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Maximize2, Minimize2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { WikiContent } from "@/components/wiki/wiki-content";
import type { TicketRef } from "@/lib/wiki-mentions";
import {
  emptyReport,
  missingReportSections,
  parseReport,
  serializeReport,
  type ReportBody,
} from "@/lib/ticket-template";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { ReportFields } from "./report-fields";
import { useDict, useLocale } from "@/i18n/provider";
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
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * DEUX MODES D'ÉDITION quand le type impose un rapport
 *
 * Le formulaire de rubriques n'est proposé que si l'on peut GARANTIR de tout
 * restituer : soit la description se relit proprement (`parseReport`), soit elle
 * est vide. Sinon - description libre héritée d'avant l'activation du modèle,
 * titres inhabituels - c'est l'éditeur Markdown qui s'ouvre, avec un mot
 * d'explication. Jamais de formulaire pré-rempli à moitié : ce serait la seule
 * façon de perdre du texte, et c'est le seul dommage irréparable ici.
 *
 * La bascule vers le Markdown est toujours ouverte (on sérialise, rien ne
 * bouge) ; la bascule inverse ne s'ouvre que lorsque le texte courant se relit.
 */

/** Hauteurs du champ, en lignes : confortable par défaut, généreuse une fois agrandi. */
const ROWS_DEFAULT = 10;
const ROWS_EXPANDED = 28;
/** Idem pour chaque rubrique du formulaire, bien plus courtes individuellement. */
const REPORT_ROWS_DEFAULT = 4;
const REPORT_ROWS_EXPANDED = 10;

export function TicketDescription({
  ticketId,
  value,
  projectKey,
  tickets,
  canEdit,
  requiresReport = false,
}: {
  ticketId: string;
  value: string | null;
  projectKey: string;
  /** Tickets du projet : citations « @ » et résolution des liens en lecture. */
  tickets: TicketRef[];
  canEdit: boolean;
  /** Le type du ticket impose-t-il les rubriques du rapport ? */
  requiresReport?: boolean;
}) {
  const router = useRouter();
  const t = useDict();
  const locale = useLocale();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [pending, setPending] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value ?? "");
  const [report, setReport] = useState<ReportBody>(emptyReport());
  const [extra, setExtra] = useState("");
  const [structured, setStructured] = useState(false);

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

  /** Ouvre l'éditeur en choisissant le mode que la description permet. */
  function beginEdit() {
    setDraft(canonical);
    if (requiresReport) {
      const parsed = parseReport(canonical);
      if (parsed) {
        setReport(parsed.sections);
        setExtra(parsed.extra);
        setStructured(true);
      } else if (!canonical.trim()) {
        setReport(emptyReport());
        setExtra("");
        setStructured(true);
      } else {
        // Description libre : on ne devine pas où la ranger, on l'ouvre telle quelle.
        setStructured(false);
      }
    } else {
      setStructured(false);
    }
    setEditing(true);
  }

  async function save() {
    if (structured && missingReportSections(report).length > 0) {
      toast.error(t.ticketTemplate.requiredHint);
      return;
    }
    const next = structured
      ? serializeReport(report, locale, extra)
      : draft.trim();
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
    setDraft(next);
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
    // Repasser au formulaire suppose que le Markdown courant se relise ; sinon
    // le bouton reste inerte plutôt que de proposer une conversion approximative.
    const reparsed = structured ? null : parseReport(draft);
    const canStructure =
      requiresReport && (reparsed !== null || !draft.trim());

    const modeSwitch = requiresReport ? (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending || (!structured && !canStructure)}
        onClick={() => {
          if (structured) {
            // Sérialiser d'abord : le Markdown affiché est exactement ce qui
            // serait enregistré, rien n'est reconstruit au retour.
            setDraft(serializeReport(report, locale, extra));
            setStructured(false);
            return;
          }
          const parsed = parseReport(draft);
          setReport(parsed?.sections ?? emptyReport());
          setExtra(parsed?.extra ?? "");
          setStructured(true);
        }}
      >
        {structured ? t.ticketTemplate.freeformTab : t.ticketTemplate.structuredTab}
      </Button>
    ) : null;

    const expandButton = (
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
    );

    const footer = (
      <div className="flex items-center justify-end gap-2">
        <Button type="button" variant="outline" onClick={cancel} disabled={pending}>
          {t.common.cancel}
        </Button>
        <Button type="button" onClick={() => void save()} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          {t.common.save}
        </Button>
      </div>
    );

    if (structured) {
      return (
        <div className="space-y-3">
          <div className="flex items-center justify-end gap-1">
            {modeSwitch}
            {expandButton}
          </div>
          <ReportFields
            idPrefix={`ticket-report-${ticketId}`}
            value={report}
            onChange={setReport}
            disabled={pending}
            rows={expanded ? REPORT_ROWS_EXPANDED : REPORT_ROWS_DEFAULT}
          />
          {extra.trim() && (
            <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
              {t.ticketTemplate.extraKept}
            </p>
          )}
          {footer}
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {requiresReport && (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {t.ticketTemplate.freeformNotice}
          </p>
        )}
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
            <>
              {modeSwitch}
              {expandButton}
            </>
          }
        />
        {footer}
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
        onClick={beginEdit}
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
          beginEdit();
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
