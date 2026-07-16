"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  createWikiPageAction,
  updateWikiPageAction,
} from "@/server/actions/wiki.actions";

/**
 * Formulaire pleine page de création / édition d'une page de wiki (remplace la
 * modale). Après enregistrement, redirige vers la page rendue. On cite un ticket
 * en écrivant sa clé (ex. RKN-3), qui devient un lien.
 */
export function WikiPageForm({
  projectId,
  projectKey,
  page,
}: {
  projectId: string;
  projectKey: string;
  page?: { id: string; title: string; content: string };
}) {
  const router = useRouter();
  const isEdit = Boolean(page);
  const wikiHref = `/projects/${projectKey}/wiki`;

  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Le titre est requis.");
      return;
    }
    setSubmitting(true);
    const res = isEdit
      ? await updateWikiPageAction({ id: page!.id, title: trimmed, content })
      : await createWikiPageAction({ projectId, title: trimmed, content });
    if (!res.ok) {
      setSubmitting(false);
      toast.error(res.error);
      return;
    }
    toast.success(isEdit ? "Page mise à jour." : "Page créée.");
    const id = isEdit ? page!.id : res.data?.id;
    router.push(`${wikiHref}?page=${id ?? ""}`);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="wiki-title">
          Titre <span className="text-destructive">*</span>
        </Label>
        <Input
          id="wiki-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Nom de la page"
          autoFocus
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="wiki-content">Contenu</Label>
        <Textarea
          id="wiki-content"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Notes, procédures, décisions... Citez des tickets avec leur clé (RKN-3)."
          rows={22}
          className="font-mono text-sm"
        />
        <p className="text-xs text-muted-foreground">
          Astuce : citez un ticket avec sa clé (ex. RKN-3) pour créer un lien vers
          lui.
        </p>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button asChild type="button" variant="outline">
          <Link href={wikiHref}>Annuler</Link>
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting && <Loader2 className="animate-spin" />}
          {isEdit ? "Enregistrer" : "Créer la page"}
        </Button>
      </div>
    </form>
  );
}
