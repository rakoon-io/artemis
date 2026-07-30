"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { InlineEdit } from "@/components/ui/inline-edit";
import { InlineSelect } from "@/components/ui/inline-select";
import { updateWikiPageAction } from "@/server/actions/wiki.actions";
import type { ParentOption } from "@/components/wiki/wiki-page-form";
import { useDict } from "@/i18n/provider";

/**
 * TITRE et PAGE PARENTE d'une page de wiki, modifiables en place.
 *
 * Ils vivaient dans le formulaire d'édition, aux côtés du contenu : changer un
 * titre demandait d'ouvrir un écran portant aussi les deux autres champs, puis
 * de le quitter. Ils se modifient désormais là où ils s'affichent - le titre
 * dans le titre, le rangement dans le fil d'Ariane.
 *
 * Les deux réémettent les champs qu'ils ne touchent PAS. Le schéma de mise à
 * jour normalise un parent absent en `null` : enregistrer un titre seul
 * remonterait la page à la racine du wiki.
 */

/** Sentinelle « aucune page parente » (Radix interdit la valeur vide). */
const ROOT = "__root__";

export function WikiTitleInline({
  pageId,
  title,
  parentId,
  content,
  canEdit,
}: {
  pageId: string;
  title: string;
  parentId: string | null;
  content: string;
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const search = useSearchParams();

  return (
    <InlineEdit
      value={title}
      field={t.wiki.form.titleLabel}
      required
      maxLength={200}
      disabled={!canEdit}
      className="text-2xl font-semibold tracking-tight"
      onSave={async (next) => {
        const res = await updateWikiPageAction({
          id: pageId,
          title: next,
          content,
          parentId,
        });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(t.wiki.form.updated);
        // Renommer change l'ADRESSE : on rejoint la nouvelle plutôt que de
        // laisser la barre afficher un slug qui n'est plus le bon. L'ancienne
        // reste archivée, les liens déjà partagés continuent d'aboutir.
        //
        // `replace` SEUL, sans `refresh` derrière : le rafraîchissement relit la
        // route COURANTE et annule la navigation à peine demandée - on restait
        // sur l'ancienne adresse, affichant l'ancien titre pourtant enregistré.
        // Naviguer suffit à recharger la page côté serveur.
        const handle = res.data?.slug ?? res.data?.id;
        if (!handle) {
          router.refresh();
          return true;
        }
        // Les autres paramètres sont conservés : une recherche en cours ne doit
        // pas disparaître parce qu'on a corrigé un titre.
        const params = new URLSearchParams(search.toString());
        params.set("page", handle);
        router.replace(`?${params.toString()}`);
        return true;
      }}
    />
  );
}

export function WikiParentInline({
  pageId,
  title,
  content,
  parentId,
  parents,
  canEdit,
}: {
  pageId: string;
  title: string;
  content: string;
  parentId: string | null;
  parents: ParentOption[];
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const current = parents.find((p) => p.id === parentId);

  return (
    <InlineSelect
      value={parentId ?? ROOT}
      // L'indentation reprend celle du plan : « Facturation » et « Remises » se
      // ressemblent trop pour qu'on les distingue sans leur profondeur.
      options={parents.map((p) => ({
        value: p.id,
        label: `${"  ".repeat(p.depth)}${p.title}`,
      }))}
      field={t.wiki.form.parentLabel}
      emptyValue={ROOT}
      emptyLabel={t.wiki.form.parentNone}
      disabled={!canEdit}
      onSave={async (next) => {
        const res = await updateWikiPageAction({
          id: pageId,
          title,
          content,
          parentId: next === ROOT ? null : next,
        });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(t.wiki.form.updated);
        router.refresh();
        return true;
      }}
    >
      <span className="text-xs text-muted-foreground">
        {current?.title ?? t.wiki.form.parentNone}
      </span>
    </InlineSelect>
  );
}
