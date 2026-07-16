"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  AtSign,
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
import { cn } from "@/lib/utils";
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

interface TicketRef {
  id: string;
  key: string;
  title: string;
}

interface MentionState {
  start: number;
  query: string;
}

/** Détecte une mention « @… » en cours de frappe autour du curseur. */
function detectMention(value: string, caret: number): MentionState | null {
  let i = caret;
  while (i > 0 && /[A-Za-z0-9-]/.test(value[i - 1])) i--;
  if (i === 0 || value[i - 1] !== "@") return null;
  const atPos = i - 1;
  // Le « @ » doit débuter un mot (précédé d'un espace, d'une ponctuation, ou du début).
  if (atPos > 0 && /[A-Za-z0-9]/.test(value[atPos - 1])) return null;
  return { start: atPos, query: value.slice(i, caret) };
}

// Propriétés à copier sur le div miroir pour retrouver la position du curseur.
const CARET_PROPS = [
  "box-sizing", "width", "height", "overflow-x", "overflow-y",
  "border-top-width", "border-right-width", "border-bottom-width", "border-left-width",
  "padding-top", "padding-right", "padding-bottom", "padding-left",
  "font-style", "font-variant", "font-weight", "font-stretch", "font-size",
  "font-family", "line-height", "letter-spacing", "word-spacing", "tab-size",
  "text-indent", "text-transform", "white-space",
];

/** Position (px, relative au textarea) d'un index de caractère, via un div miroir. */
function caretPosition(el: HTMLTextAreaElement, index: number) {
  const computed = window.getComputedStyle(el);
  const div = document.createElement("div");
  const style = div.style;
  style.position = "absolute";
  style.visibility = "hidden";
  style.whiteSpace = "pre-wrap";
  style.wordWrap = "break-word";
  for (const prop of CARET_PROPS) {
    style.setProperty(prop, computed.getPropertyValue(prop));
  }
  div.textContent = el.value.slice(0, index);
  const span = document.createElement("span");
  span.textContent = el.value.slice(index) || ".";
  div.appendChild(span);
  document.body.appendChild(div);
  const top = span.offsetTop + parseFloat(computed.borderTopWidth);
  const left = span.offsetLeft + parseFloat(computed.borderLeftWidth);
  const height =
    parseFloat(computed.lineHeight) || parseFloat(computed.fontSize) * 1.2;
  document.body.removeChild(div);
  return { top, left, height };
}

/**
 * Formulaire pleine page de création / édition d'une page de wiki. Édition en
 * **Markdown étendu** avec barre d'outils, aperçu, et **citation de tâches avec @** :
 * tapez « @ » pour choisir un ticket, ce qui insère « @RKN-123 » (rendu en lien).
 */
export function WikiPageForm({
  projectId,
  projectKey,
  tickets,
  page,
}: {
  projectId: string;
  projectKey: string;
  tickets: TicketRef[];
  page?: { id: string; title: string; content: string };
}) {
  const router = useRouter();
  const isEdit = Boolean(page);
  const wikiHref = `/projects/${projectKey}/wiki`;

  const [title, setTitle] = useState(page?.title ?? "");
  const [content, setContent] = useState(page?.content ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });

  const ticketMap: Record<string, string> = Object.fromEntries(
    tickets.map((t) => [t.key.toUpperCase(), t.id]),
  );

  const mentionResults = mention
    ? tickets
        .filter((t) => {
          const q = mention.query.toLowerCase();
          return (
            t.key.toLowerCase().includes(q) || t.title.toLowerCase().includes(q)
          );
        })
        .slice(0, 8)
    : [];

  /** Textarea de l'éditeur (accès dans les handlers, hors rendu). */
  function editor(): HTMLTextAreaElement | null {
    return document.getElementById("wiki-content") as HTMLTextAreaElement | null;
  }

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

  /** Insère « @ » et ouvre la liste des tâches. */
  function triggerMention() {
    const ta = editor();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const needSpace = start > 0 && /[A-Za-z0-9]/.test(content[start - 1]);
    const insert = needSpace ? " @" : "@";
    const next = content.slice(0, start) + insert + content.slice(end);
    setContent(next);
    const caret = start + insert.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
      updateMention(ta);
    });
  }

  /** Remplace la mention en cours par « @RKN-123 ». */
  function insertMention(ticket: TicketRef) {
    const ta = editor();
    if (!ta || !mention) return;
    const caret = ta.selectionStart;
    const before = content.slice(0, mention.start);
    const after = content.slice(caret);
    const inserted = `@${ticket.key} `;
    setContent(before + inserted + after);
    setMention(null);
    const pos = before.length + inserted.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  /** Recalcule l'état de mention et sa position (ancrée au curseur). */
  function updateMention(ta: HTMLTextAreaElement) {
    const m = detectMention(ta.value, ta.selectionStart);
    setMention(m);
    setMentionIndex(0);
    if (m) {
      const c = caretPosition(ta, m.start);
      const width = 288;
      setMentionPos({
        top: c.top - ta.scrollTop + c.height + 4,
        left: Math.max(0, Math.min(c.left, ta.clientWidth - width)),
      });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || mentionResults.length === 0) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setMentionIndex((i) => (i + 1) % mentionResults.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setMentionIndex((i) => (i - 1 + mentionResults.length) % mentionResults.length);
    } else if (event.key === "Enter" || event.key === "Tab") {
      event.preventDefault();
      insertMention(mentionResults[Math.min(mentionIndex, mentionResults.length - 1)]);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setMention(null);
    }
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
    { icon: AtSign, label: "Citer une tâche", run: triggerMention },
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
            <div className="relative">
              <Textarea
                id="wiki-content"
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  updateMention(e.currentTarget);
                }}
                onClick={(e) => updateMention(e.currentTarget)}
                onKeyDown={handleKeyDown}
                placeholder="Écrivez en Markdown. Tapez @ pour citer une tâche (ex. @RKN-3)."
                rows={20}
                className="font-mono text-sm"
              />
              {mention && mentionResults.length > 0 && (
                <div
                  className="absolute z-20 max-h-56 w-72 overflow-y-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
                  style={{ top: mentionPos.top, left: mentionPos.left }}
                >
                  <p className="px-2 py-1 text-xs text-muted-foreground">
                    Citer une tâche
                  </p>
                  {mentionResults.map((t, i) => (
                    <button
                      key={t.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        insertMention(t);
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                        i === mentionIndex
                          ? "bg-accent text-accent-foreground"
                          : "hover:bg-accent/50",
                      )}
                    >
                      <span className="shrink-0 font-mono text-xs text-muted-foreground">
                        {t.key}
                      </span>
                      <span className="truncate">{t.title}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Markdown étendu (GFM) : titres, gras, listes, cases à cocher, tableaux,
              code. Tapez <span className="font-medium text-foreground">@</span> pour
              citer une tâche (elle devient un lien).
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
