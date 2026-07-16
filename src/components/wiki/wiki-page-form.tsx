"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  Bold,
  Code,
  Heading2,
  Italic,
  Link2,
  List,
  ListChecks,
  Loader2,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WikiContent } from "@/components/wiki/wiki-content";
import {
  createWikiPageAction,
  updateWikiPageAction,
} from "@/server/actions/wiki.actions";

/**
 * Formulaire pleine page de création / édition d'une page de wiki. Édition en
 * **Markdown étendu** avec barre d'outils et aperçu en direct. Après enregistrement,
 * redirige vers la page rendue. On cite un ticket avec sa clé (ex. RKN-3).
 */
export function WikiPageForm({
  projectId,
  projectKey,
  ticketMap,
  page,
}: {
  projectId: string;
  projectKey: string;
  ticketMap: Record<string, string>;
  page?: { id: string; title: string; content: string };
}) {
  const router = useRouter();
  const isEdit = Boolean(page);
  const wikiHref = `/projects/${projectKey}/wiki`;

  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [submitting, setSubmitting] = useState(false);

  /** Textarea de l'éditeur (accès dans les handlers, hors rendu). */
  function editor(): HTMLTextAreaElement | null {
    return document.getElementById("wiki-content") as HTMLTextAreaElement | null;
  }

  /** Entoure la sélection (ou le curseur) de `before`/`after`. */
  function wrap(before: string, after: string = before) {
    const ta = editor();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = content.slice(start, end);
    setContent(
      content.slice(0, start) + before + selected + after + content.slice(end),
    );
    const from = start + before.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(from, from + selected.length);
    });
  }

  /** Insère `prefix` en tête de la ligne courante (titres, listes, citations). */
  function prefixLine(prefix: string) {
    const ta = editor();
    if (!ta) return;
    const start = ta.selectionStart;
    const lineStart = content.lastIndexOf("\n", start - 1) + 1;
    setContent(content.slice(0, lineStart) + prefix + content.slice(lineStart));
    const caret = start + prefix.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  const tools = [
    { icon: Bold, label: "Gras", run: () => wrap("**") },
    { icon: Italic, label: "Italique", run: () => wrap("_") },
    { icon: Heading2, label: "Titre", run: () => prefixLine("## ") },
    { icon: List, label: "Liste", run: () => prefixLine("- ") },
    { icon: ListChecks, label: "Case à cocher", run: () => prefixLine("- [ ] ") },
    { icon: Quote, label: "Citation", run: () => prefixLine("> ") },
    { icon: Code, label: "Code", run: () => wrap("`") },
    { icon: Link2, label: "Lien", run: () => wrap("[", "](url)") },
  ];

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
        <Label htmlFor="wiki-content">Contenu (Markdown)</Label>
        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Écrire</TabsTrigger>
            <TabsTrigger value="preview">Aperçu</TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="space-y-2">
            <div className="flex flex-wrap gap-1 rounded-md border p-1">
              {tools.map((t) => (
                <Button
                  key={t.label}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8"
                  title={t.label}
                  aria-label={t.label}
                  onClick={t.run}
                >
                  <t.icon />
                </Button>
              ))}
            </div>
            <Textarea
              id="wiki-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrivez en Markdown. Titres (##), listes (-), tableaux, code... Citez un ticket avec sa clé (RKN-3)."
              rows={20}
              className="font-mono text-sm"
            />
            <p className="text-xs text-muted-foreground">
              Markdown étendu pris en charge (GFM) : titres, gras, listes, cases à
              cocher, tableaux, code, citations. Une clé de ticket (ex. RKN-3)
              devient un lien.
            </p>
          </TabsContent>

          <TabsContent value="preview">
            <div className="min-h-40 rounded-md border p-4">
              {content.trim() ? (
                <WikiContent
                  content={content}
                  projectKey={projectKey}
                  ticketMap={ticketMap}
                />
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  Rien à prévisualiser pour l&apos;instant.
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
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
