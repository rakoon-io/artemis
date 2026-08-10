"use client";

import { useRef, useState } from "react";
import {
  AlertTriangle,
  AtSign,
  Bold,
  Code,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Info,
  Italic,
  Link2,
  List,
  ListChecks,
  Loader2,
  OctagonAlert,
  Quote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import dynamic from "next/dynamic";
import { WikiContent } from "@/components/wiki/wiki-content";
import { MENTION_LIST_WIDTH, MentionList } from "./mention-list";
import { calloutTemplate } from "@/lib/wiki-callouts";
import {
  detectMention,
  rankMentions,
  userMentionMarkdown,
  type MentionState,
  type MentionTarget,
  type TicketRef,
  type UserRef,
} from "@/lib/wiki-mentions";
import { useDict } from "@/i18n/provider";

/**
 * Éditeur MARKDOWN partagé : barre d'outils, onglets écriture / aperçu et
 * citation de tickets par « @ ». Extrait du formulaire de wiki pour servir
 * partout où l'on saisit du texte riche - wiki ET description de ticket - afin
 * que les deux surfaces ne divergent pas.
 *
 * Composant CONTRÔLÉ : il ne connaît ni l'enregistrement ni la validation, que
 * son appelant assume. En particulier il n'enregistre RIEN à la perte de focus :
 * cliquer un bouton de la barre d'outils fait sortir le curseur du champ, et une
 * sauvegarde au blur refermerait l'éditeur au premier gras demandé.
 *
 * Les libellés viennent du namespace `wiki.form.tools` : ils décrivent du
 * Markdown, pas le wiki, et restent donc valables ici.
 */

export interface MarkdownEditorProps {
  /** Id du textarea (lie un `<Label>` externe, et sert d'ancre au curseur). */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Tickets citables via « @ » (autocomplétion). */
  tickets: TicketRef[];
  /**
   * Personnes citables via le même « @ ». Vide par défaut : une surface qui ne
   * connaît pas les membres du projet continue de ne proposer que des tâches,
   * au lieu de proposer une liste vide de gens.
   */
  users?: UserRef[];
  /** Clé du projet et table des clés, pour l'aperçu et les liens de citation. */
  projectKey: string;
  ticketMap: Record<string, string>;
  placeholder?: string;
  rows?: number;
  /** Classe du textarea (hauteur imposée, police…). */
  textareaClassName?: string;
  disabled?: boolean;
  /** Contenu inséré à droite des onglets (ex. bouton « Agrandir »). */
  toolbarExtra?: React.ReactNode;
  /**
   * Touches non gérées par l'autocomplétion (ex. ⌘+Entrée pour enregistrer).
   *
   * Le type est celui d'un élément quelconque : en mise en forme, la frappe
   * remonte d'une zone `contenteditable` et non d'un `<textarea>`. Les deux
   * appelants ne lisent que la touche et ses modificateurs.
   */
  onKeyDown?: (event: React.KeyboardEvent<HTMLElement>) => void;
  /**
   * COLLAGE D'IMAGE. Reçoit le fichier, le dépose où il doit l'être, et rend de
   * quoi le citer - `null` si le dépôt échoue, auquel cas rien n'est inséré.
   *
   * L'éditeur ne sait pas où vont les fichiers, et c'est voulu : une page de
   * wiki et un ticket ne les rangent pas au même endroit. Absent, le collage
   * d'image retrouve le comportement du navigateur.
   */
  onPasteImage?: (file: File) => Promise<{ src: string; alt: string } | null>;
}

// Propriétés à copier sur le div miroir pour retrouver la position du curseur.
const CARET_PROPS = [
  "box-sizing",
  "width",
  "height",
  "overflow-x",
  "overflow-y",
  "border-top-width",
  "border-right-width",
  "border-bottom-width",
  "border-left-width",
  "padding-top",
  "padding-right",
  "padding-bottom",
  "padding-left",
  "font-style",
  "font-variant",
  "font-weight",
  "font-stretch",
  "font-size",
  "font-family",
  "line-height",
  "letter-spacing",
  "word-spacing",
  "tab-size",
  "text-indent",
  "text-transform",
  "white-space",
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
 * L'éditeur riche pèse une centaine de kilo-octets : il n'est téléchargé qu'au
 * moment où l'on ouvre une saisie, jamais à la lecture d'une page. `ssr: false`
 * parce qu'il manipule le DOM directement (ProseMirror).
 */
const WysiwygEditor = dynamic(
  () => import("./wysiwyg-editor").then((m) => m.WysiwygEditor),
  { ssr: false, loading: LoadingEditor },
);

function LoadingEditor() {
  return (
    <div className="flex min-h-40 items-center justify-center rounded-md border text-sm text-muted-foreground">
      <Loader2 className="mr-2 size-4 animate-spin" />
      Chargement…
    </div>
  );
}

export function MarkdownEditor({
  id,
  value,
  onChange,
  tickets,
  users = [],
  projectKey,
  ticketMap,
  placeholder,
  rows = 12,
  textareaClassName,
  disabled = false,
  toolbarExtra,
  onKeyDown,
  onPasteImage,
}: MarkdownEditorProps) {
  const t = useDict();
  const taRef = useRef<HTMLTextAreaElement | null>(null);
  const [mention, setMention] = useState<MentionState | null>(null);
  const [mentionIndex, setMentionIndex] = useState(0);
  const [mentionPos, setMentionPos] = useState({ top: 0, left: 0 });

  const mentionResults = mention
    ? rankMentions(tickets, users, mention.query)
    : [];

  function editor(): HTMLTextAreaElement | null {
    return taRef.current;
  }

  function wrap(before: string, after: string = before) {
    const ta = editor();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const selected = value.slice(start, end);
    onChange(
      value.slice(0, start) + before + selected + after + value.slice(end),
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
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    onChange(value.slice(0, lineStart) + prefix + value.slice(lineStart));
    const caret = start + prefix.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
    });
  }

  /** Insère « @ » et ouvre la liste des propositions. */
  function triggerMention() {
    const ta = editor();
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const needSpace = start > 0 && /[A-Za-z0-9]/.test(value[start - 1]);
    const insert = needSpace ? " @" : "@";
    const next = value.slice(0, start) + insert + value.slice(end);
    onChange(next);
    const caret = start + insert.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(caret, caret);
      updateMention(ta);
    });
  }

  /**
   * Remplace la mention en cours par « @RKN-123 » ou, pour une personne, par le
   * lien Markdown qui la désigne (cf. `userMentionMarkdown`).
   */
  function insertMention(target: MentionTarget) {
    const ta = editor();
    if (!ta || !mention) return;
    const caret = ta.selectionStart;
    const before = value.slice(0, mention.start);
    const after = value.slice(caret);
    const inserted =
      target.kind === "ticket"
        ? `@${target.ticket.key} `
        : `${userMentionMarkdown(target.user)} `;
    onChange(before + inserted + after);
    setMention(null);
    const pos = before.length + inserted.length;
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(pos, pos);
    });
  }

  /** Insère du texte au curseur, sans passer par la sélection courante. */
  function insertAtCaret(text: string) {
    const ta = editor();
    const start = ta ? ta.selectionStart : value.length;
    const end = ta ? ta.selectionEnd : value.length;
    const next = value.slice(0, start) + text + value.slice(end);
    onChange(next);
    const caret = start + text.length;
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  /**
   * Colle une IMAGE : on empêche le collage ordinaire - qui n'insérerait qu'un
   * nom de fichier ou rien -, on dépose le fichier, puis on écrit sa citation au
   * curseur. Un collage sans image suit son cours normal.
   */
  async function handlePaste(event: React.ClipboardEvent<HTMLTextAreaElement>) {
    if (!onPasteImage) return;
    const images = Array.from(event.clipboardData.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (images.length === 0) return;
    event.preventDefault();
    for (const file of images) {
      const done = await onPasteImage(file);
      if (done) insertAtCaret(`![${done.alt}](${done.src})\n`);
    }
  }

  /** Recalcule l'état de mention et sa position (ancrée au curseur). */
  function updateMention(ta: HTMLTextAreaElement) {
    const m = detectMention(ta.value, ta.selectionStart);
    setMention(m);
    setMentionIndex(0);
    if (m) {
      const c = caretPosition(ta, m.start);
      const width = MENTION_LIST_WIDTH;
      setMentionPos({
        top: c.top - ta.scrollTop + c.height + 4,
        left: Math.max(0, Math.min(c.left, ta.clientWidth - width)),
      });
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    // L'autocomplétion capte les flèches / Entrée / Échap tant qu'elle est ouverte ;
    // seules les touches non consommées ici remontent à l'appelant.
    if (mention && mentionResults.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionIndex((i) => (i + 1) % mentionResults.length);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionIndex(
          (i) => (i - 1 + mentionResults.length) % mentionResults.length,
        );
        return;
      }
      if (event.key === "Enter" || event.key === "Tab") {
        event.preventDefault();
        insertMention(
          mentionResults[Math.min(mentionIndex, mentionResults.length - 1)],
        );
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setMention(null);
        return;
      }
    }
    onKeyDown?.(event);
  }

  /** Insère un bloc entier en tête de la ligne courante (encarts). */
  function insertBlock(markdown: string) {
    const ta = editor();
    const start = ta ? ta.selectionStart : value.length;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    // Une ligne vide avant, si l'on n'est pas déjà en début de bloc : sans elle
    // l'encart se collerait au paragraphe précédent et n'en serait plus un.
    const prefix = lineStart > 0 && value[lineStart - 2] !== "\n" ? "\n" : "";
    const next =
      value.slice(0, lineStart) + prefix + markdown + value.slice(lineStart);
    onChange(next);
    const caret = lineStart + prefix.length + markdown.length;
    requestAnimationFrame(() => {
      ta?.focus();
      ta?.setSelectionRange(caret, caret);
    });
  }

  const tools = [
    { icon: Bold, label: t.wiki.form.tools.bold, run: () => wrap("**") },
    { icon: Italic, label: t.wiki.form.tools.italic, run: () => wrap("_") },
    {
      icon: Heading1,
      label: t.wiki.form.tools.h1,
      run: () => prefixLine("# "),
    },
    {
      icon: Heading2,
      label: t.wiki.form.tools.h2,
      run: () => prefixLine("## "),
    },
    {
      icon: Heading3,
      label: t.wiki.form.tools.h3,
      run: () => prefixLine("### "),
    },
    {
      icon: Heading4,
      label: t.wiki.form.tools.h4,
      run: () => prefixLine("#### "),
    },
    { icon: List, label: t.wiki.form.tools.list, run: () => prefixLine("- ") },
    {
      icon: ListChecks,
      label: t.wiki.form.tools.checkbox,
      run: () => prefixLine("- [ ] "),
    },
    {
      icon: Quote,
      label: t.wiki.form.tools.quote,
      run: () => prefixLine("> "),
    },
    { icon: Code, label: t.wiki.form.tools.code, run: () => wrap("`") },
    {
      icon: Link2,
      label: t.wiki.form.tools.link,
      run: () => wrap("[", "](url)"),
    },
    { icon: AtSign, label: t.wiki.form.tools.mention, run: triggerMention },
    {
      icon: Info,
      label: t.wiki.callouts.note,
      run: () => insertBlock(calloutTemplate("note")),
    },
    {
      icon: AlertTriangle,
      label: t.wiki.callouts.warning,
      run: () => insertBlock(calloutTemplate("warning")),
    },
    {
      icon: OctagonAlert,
      label: t.wiki.callouts.important,
      run: () => insertBlock(calloutTemplate("important")),
    },
  ];

  // Saisie ASSISTÉE par défaut : c'est elle qui sert à qui n'écrit pas de
  // Markdown, et l'autre reste à un clic. `richKey` force la reconstruction de
  // l'éditeur riche quand on y revient, pour qu'il reparte du texte courant -
  // il est maître de son contenu une fois monté (cf. wysiwyg-editor.tsx).
  const [rich, setRich] = useState(true);
  const [richKey, setRichKey] = useState(0);

  const modeSwitch = (
    <div
      className="flex items-center gap-1"
      role="group"
      aria-label={t.wiki.form.modeAria}
    >
      <Button
        type="button"
        size="sm"
        variant={rich ? "secondary" : "ghost"}
        aria-pressed={rich}
        disabled={disabled}
        onClick={() => {
          setRichKey((n) => n + 1);
          setRich(true);
        }}
      >
        {t.wiki.form.modeRich}
      </Button>
      <Button
        type="button"
        size="sm"
        variant={rich ? "ghost" : "secondary"}
        aria-pressed={!rich}
        disabled={disabled}
        onClick={() => setRich(false)}
      >
        {t.wiki.form.modeMarkdown}
      </Button>
    </div>
  );

  if (rich) {
    return (
      /**
       * Les raccourcis d'enregistrement écoutés SUR LE CONTENEUR : la frappe
       * remonte de la zone d'édition jusqu'ici. Ils manquaient purement et
       * simplement en mise en forme - c'est-à-dire dans le mode par défaut -,
       * alors que toutes les surfaces d'édition en place les annoncent.
       *
       * L'autocomplétion arrête la propagation des touches qu'elle consomme :
       * Échap referme la liste sans annuler la modification en cours.
       */
      <div className="space-y-2" onKeyDown={onKeyDown}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          {modeSwitch}
          {toolbarExtra}
        </div>
        <WysiwygEditor
          key={richKey}
          id={id}
          value={value}
          onChange={onChange}
          disabled={disabled}
          // Les mêmes tickets qu'en saisie Markdown : la détection et le
          // classement passent par le même module, les deux modes proposent
          // donc exactement la même liste dans le même ordre.
          tickets={tickets}
          users={users}
          onPasteImage={onPasteImage}
          // L'invite du mode brut parle de MARKDOWN, ce qui n'a pas cours ici.
          // La citation par « @ », elle, fonctionne désormais des deux côtés -
          // c'est `richHint`, sous l'éditeur, qui le dit.
          placeholder={t.wiki.form.richPlaceholder}
        />
        <p className="text-xs text-muted-foreground">{t.wiki.form.richHint}</p>
      </div>
    );
  }

  return (
    <Tabs defaultValue="write">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {modeSwitch}
          <TabsList>
            <TabsTrigger value="write">{t.wiki.form.tabWrite}</TabsTrigger>
            <TabsTrigger value="preview">{t.wiki.form.tabPreview}</TabsTrigger>
          </TabsList>
        </div>
        {toolbarExtra}
      </div>

      <TabsContent value="write" className="space-y-2">
        <div className="flex flex-wrap gap-1 rounded-md border p-1">
          {tools.map((tool) => (
            <Button
              key={tool.label}
              type="button"
              variant="ghost"
              size="icon"
              className="size-8"
              title={tool.label}
              aria-label={tool.label}
              disabled={disabled}
              // `onMouseDown` prévenu : sans cela le clic sortirait le curseur du
              // textarea et ferait perdre la sélection à envelopper.
              onMouseDown={(e) => e.preventDefault()}
              onClick={tool.run}
            >
              <tool.icon />
            </Button>
          ))}
        </div>
        <div className="relative">
          <Textarea
            id={id}
            ref={taRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              updateMention(e.currentTarget);
            }}
            onClick={(e) => updateMention(e.currentTarget)}
            onKeyDown={handleKeyDown}
            onPaste={(e) => void handlePaste(e)}
            placeholder={placeholder}
            rows={rows}
            disabled={disabled}
            className={cn("resize-y font-mono text-sm", textareaClassName)}
          />
          {/* La MÊME liste qu'en mise en forme. Elle était recopiée ici, et les
              deux copies rendaient déjà des choses différentes dès qu'une
              proposition cessait d'être une tâche. */}
          {mention && (
            <MentionList
              results={mentionResults}
              activeIndex={mentionIndex}
              label={t.wiki.form.tools.mention}
              style={{ top: mentionPos.top, left: mentionPos.left }}
              onPick={insertMention}
            />
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {t.wiki.form.markdownHelpBefore}
          <span className="font-medium text-foreground">@</span>
          {t.wiki.form.markdownHelpAfter}
        </p>
      </TabsContent>

      <TabsContent value="preview">
        <div className="min-h-40 rounded-md border p-4">
          {value.trim() ? (
            <WikiContent
              content={value}
              projectKey={projectKey}
              ticketMap={ticketMap}
            />
          ) : (
            <p className="text-sm italic text-muted-foreground">
              {t.wiki.form.nothingToPreview}
            </p>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
