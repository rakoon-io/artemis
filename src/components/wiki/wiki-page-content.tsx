"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import { WikiContent } from "@/components/wiki/wiki-content";
import type { TicketHint } from "@/components/wiki/ticket-hover-link";
import type { TicketRef } from "@/lib/wiki-mentions";
import { updateWikiPageAction } from "@/server/actions/wiki.actions";
import { uploadWikiFile, wikiFileHref } from "./wiki-file-upload";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * CONTENU D'UNE PAGE DE WIKI, modifiable EN PLACE.
 *
 * La page se lisait, et « Modifier » ouvrait un formulaire portant le titre, le
 * parent et le contenu - trois champs pour n'en changer qu'un, et un écran de
 * plus à quitter pour revenir lire. Le titre et le parent se modifient
 * désormais là où ils s'affichent ; il ne restait donc au formulaire que le
 * contenu, c'est-à-dire ce que cette surface fait.
 *
 * Deux contraintes reprises de la description de ticket, pour les mêmes raisons :
 *
 *  1. PAS D'ENREGISTREMENT À LA PERTE DE FOCUS. Cliquer « Gras » sort le curseur
 *     du champ ; enregistrer au blur refermerait l'éditeur au premier style
 *     demandé. La validation est explicite - ⌘/Ctrl + Entrée valide, Échap
 *     annule.
 *  2. LE RENDU CONTIENT DES LIENS. On ne peut donc pas envelopper la lecture
 *     dans un `<button>` : contenu interactif imbriqué, HTML invalide, et les
 *     citations de tickets deviendraient inatteignables. Le clic est capté sur
 *     un conteneur ordinaire qui ignore les clics visant un élément interactif,
 *     et un vrai bouton assure l'accès au clavier.
 *
 * Le TITRE et le PARENT sont réémis tels quels à l'enregistrement : le schéma de
 * mise à jour normalise un parent absent en `null`, et omettre le champ
 * remonterait la page à la racine du wiki à chaque sauvegarde.
 */

const ROWS = 16;

export function WikiPageContent({
  pageId,
  pageTitle,
  parentId,
  value,
  projectKey,
  tickets,
  ticketMap,
  ticketHints,
  canEdit,
}: {
  pageId: string;
  pageTitle: string;
  parentId: string | null;
  value: string;
  projectKey: string;
  tickets: TicketRef[];
  ticketMap: Record<string, string>;
  ticketHints?: Record<string, TicketHint>;
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [saving, setSaving] = useState(false);

  function open() {
    setDraft(value);
    setEditing(true);
  }

  async function save() {
    setSaving(true);
    const res = await updateWikiPageAction({
      id: pageId,
      title: pageTitle,
      content: draft,
      parentId,
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.form.updated);
    setEditing(false);
    router.refresh();
  }

  if (editing) {
    return (
      <div className="space-y-2">
        <MarkdownEditor
          id={`wiki-content-${pageId}`}
          value={draft}
          onChange={setDraft}
          tickets={tickets}
          projectKey={projectKey}
          ticketMap={ticketMap}
          placeholder={t.wiki.form.contentPlaceholder}
          rows={ROWS}
          disabled={saving}
          /* Une image collée est DÉPOSÉE sur la page, puis citée par son
             adresse stable. Le texte n'embarque jamais l'image elle-même : une
             capture d'écran en base64 pèserait plus que toute la page, et la
             recherche plein texte l'indexerait. */
          onPasteImage={async (file) => {
            const done = await uploadWikiFile(pageId, file);
            if (!done) {
              toast.error(t.wiki.files.uploadFailed);
              return null;
            }
            return { src: wikiFileHref(done.id), alt: done.filename };
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setEditing(false);
              return;
            }
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              void save();
            }
          }}
        />
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={saving}
            onClick={() => setEditing(false)}
          >
            {t.common.cancel}
          </Button>
          <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
            {saving && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    );
  }

  if (!canEdit) {
    return value.trim() ? (
      <WikiContent
        content={value}
        projectKey={projectKey}
        ticketMap={ticketMap}
        ticketHints={ticketHints}
      />
    ) : (
      <p className="text-sm italic text-muted-foreground">
        {fmt(t.wiki.index.emptyContentHint, { action: t.common.edit })}
      </p>
    );
  }

  return (
    <div className="group/content relative">
      {/* Le clic ouvre l'édition, SAUF s'il visait un lien, une case à cocher ou
          tout autre élément interactif du rendu : cliquer une citation doit
          mener au ticket, pas ouvrir l'éditeur. */}
      <div
        onClick={(event) => {
          if ((event.target as HTMLElement).closest("a,button,input,summary")) return;
          open();
        }}
        className="cursor-text"
      >
        {value.trim() ? (
          <WikiContent
            content={value}
            projectKey={projectKey}
            ticketMap={ticketMap}
            ticketHints={ticketHints}
          />
        ) : (
          <p className="text-sm italic text-muted-foreground">
            {t.wiki.form.clickToWrite}
          </p>
        )}
      </div>
      {/* Accès CLAVIER, et affordance : le conteneur ci-dessus n'est pas
          focusable, ce bouton l'est. Discret au repos, il paraît au survol. */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={open}
        className="absolute right-0 top-0 opacity-0 transition-opacity focus-visible:opacity-100 group-hover/content:opacity-100 pointer-coarse:opacity-100"
      >
        <Pencil />
        {t.common.edit}
      </Button>
    </div>
  );
}
