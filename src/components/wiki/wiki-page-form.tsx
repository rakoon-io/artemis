"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MarkdownEditor } from "@/components/markdown/markdown-editor";
import type { TicketRef } from "@/lib/wiki-mentions";
import {
  createWikiPageAction,
  updateWikiPageAction,
} from "@/server/actions/wiki.actions";
import { useDict } from "@/i18n/provider";

/**
 * Formulaire pleine page de création / édition d'une page de wiki.
 *
 * La saisie du contenu est déléguée à `MarkdownEditor` (barre d'outils, aperçu,
 * citation de tickets par « @ ») : le même éditeur sert à la description d'un
 * ticket, si bien que les deux surfaces ne peuvent plus diverger.
 */

/** Valeur du Select pour « aucune page parente » (Radix interdit la valeur vide). */
const ROOT_VALUE = "__root__";

/** Option de page parente (arbre aplati avec profondeur pour l'indentation). */
export interface ParentOption {
  id: string;
  title: string;
  depth: number;
}

export function WikiPageForm({
  projectId,
  projectKey,
  tickets,
  parents,
  defaultParentId,
  page,
}: {
  projectId: string;
  projectKey: string;
  tickets: TicketRef[];
  parents: ParentOption[];
  defaultParentId?: string | null;
  page?: { id: string; title: string; content: string; parentId: string | null };
}) {
  const t = useDict();
  const router = useRouter();
  const isEdit = Boolean(page);
  const wikiHref = `/projects/${projectKey}/wiki`;

  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [parentId, setParentId] = useState<string | null>(
    page?.parentId ?? defaultParentId ?? null,
  );
  const [submitting, setSubmitting] = useState(false);

  const ticketMap: Record<string, string> = Object.fromEntries(
    tickets.map((ticket) => [ticket.key.toUpperCase(), ticket.id]),
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error(t.wiki.form.titleRequired);
      return;
    }
    setSubmitting(true);
    const res = isEdit
      ? await updateWikiPageAction({ id: page!.id, title: trimmed, content, parentId })
      : await createWikiPageAction({ projectId, title: trimmed, content, parentId });
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    toast.success(isEdit ? t.wiki.form.updated : t.wiki.form.created);
    const id = isEdit ? page!.id : res.data?.id;
    router.push(`${wikiHref}?page=${id ?? ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="wiki-title">
          {t.wiki.form.titleLabel} <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wiki-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t.wiki.form.titlePlaceholder}
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wiki-parent">{t.wiki.form.parentLabel}</Label>
        <Select
          value={parentId ?? ROOT_VALUE}
          onValueChange={(v) => setParentId(v === ROOT_VALUE ? null : v)}
        >
          <SelectTrigger id="wiki-parent" className="w-full sm:w-96">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROOT_VALUE}>{t.wiki.form.parentNone}</SelectItem>
            {parents.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                <span style={{ paddingLeft: `${p.depth * 14}px` }}>
                  {p.title}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {t.wiki.form.parentHelp}
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wiki-content">{t.wiki.form.contentLabel}</Label>
        <MarkdownEditor
          id="wiki-content"
          value={content}
          onChange={setContent}
          tickets={tickets}
          projectKey={projectKey}
          ticketMap={ticketMap}
          placeholder={t.wiki.form.contentPlaceholder}
          rows={20}
        />
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={wikiHref}>{t.common.cancel}</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {isEdit ? t.common.save : t.wiki.form.createSubmit}
        </Button>
      </div>
    </form>
  );
}
