"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AtSign,
  Bold,
  Code,
  Italic,
  List,
  ListOrdered,
  Quote,
  Strikethrough,
} from "lucide-react";
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
} from "@milkdown/kit/core";
import { $prose } from "@milkdown/kit/utils";
import { Plugin } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { listener, listenerCtx } from "@milkdown/kit/plugin/listener";
import { callCommand } from "@milkdown/kit/utils";
import {
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInBlockquoteCommand,
  wrapInBulletListCommand,
  wrapInOrderedListCommand,
} from "@milkdown/kit/preset/commonmark";
import { toggleStrikethroughCommand } from "@milkdown/kit/preset/gfm";
import { Milkdown, MilkdownProvider, useEditor, useInstance } from "@milkdown/react";
import type { CmdKey } from "@milkdown/kit/core";
import { Button } from "@/components/ui/button";
import { MENTION_LIST_WIDTH, MentionList } from "./mention-list";
import {
  detectMention,
  rankTickets,
  type TicketRef,
} from "@/lib/wiki-mentions";
import { useDict } from "@/i18n/provider";
import "@milkdown/kit/prose/view/style/prosemirror.css";

/**
 * ÉDITEUR RICHE - la mise en forme est VISIBLE pendant la saisie : un titre
 * s'affiche gros, une liste s'affiche à puces. Destiné à qui n'écrit pas de
 * Markdown, sans priver les autres de la saisie brute (cf. `MarkdownEditor`,
 * qui bascule de l'un à l'autre).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI MILKDOWN
 *
 * Son document EST du Markdown, sérialisé par remark - la même grammaire que
 * `remark-gfm`, déjà utilisée pour l'affichage. Le projet n'a donc qu'une seule
 * façon de lire et d'écrire du Markdown, et non deux qui finiraient par diverger.
 *
 * C'était la condition : trois analyseurs relisent ce Markdown (rubriques de
 * tickets, structure des réunions, sommaire). L'aller-retour a été vérifié sur
 * l'intégralité du contenu réel avant d'adopter la bibliothèque - aucune perte,
 * aucune rubrique escamotée.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * NON CONTRÔLÉ APRÈS MONTAGE
 *
 * La valeur initiale est posée une fois ; ensuite l'éditeur est maître de son
 * contenu et remonte les changements. Lui réimposer la valeur du parent à chaque
 * frappe replacerait le curseur en début de document - le défaut classique des
 * éditeurs riches branchés comme un simple champ de formulaire.
 */

/**
 * Rend la classe d'affichage du wiki à la zone d'édition : on écrit ce qu'on
 * lira. Aucune bordure ici - c'est le conteneur qui en porte UNE SEULE, sans
 * quoi la barre d'outils et la zone de saisie dessinent deux cadres distincts.
 */
const CONTENT_CLASS =
  "wiki-prose relative min-h-40 bg-transparent px-3 py-2 outline-none";

function Toolbar({
  disabled,
  onMention,
}: {
  disabled?: boolean;
  /** Absent = la surface n'a rien à citer, le bouton ne paraît pas. */
  onMention?: () => void;
}) {
  const t = useDict();
  const [loading, getEditor] = useInstance();

  const run = useCallback(
    // `CmdKey<unknown>` : la charge utile varie d'une commande à l'autre, et
    // aucune de celles utilisées ici n'en attend.
    (command: CmdKey<unknown>) => () => {
      if (loading) return;
      getEditor()?.action(callCommand(command));
    },
    [loading, getEditor],
  );

  const actions = [
    { icon: Bold, label: t.wiki.form.tools.bold, cmd: toggleStrongCommand.key },
    { icon: Italic, label: t.wiki.form.tools.italic, cmd: toggleEmphasisCommand.key },
    {
      icon: Strikethrough,
      label: t.wiki.form.tools.strike,
      cmd: toggleStrikethroughCommand.key,
    },
    { icon: List, label: t.wiki.form.tools.list, cmd: wrapInBulletListCommand.key },
    {
      icon: ListOrdered,
      label: t.wiki.form.tools.orderedList,
      cmd: wrapInOrderedListCommand.key,
    },
    { icon: Quote, label: t.wiki.form.tools.quote, cmd: wrapInBlockquoteCommand.key },
    { icon: Code, label: t.wiki.form.tools.code, cmd: toggleInlineCodeCommand.key },
  ] as const;

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-input bg-muted/40 p-1">
      {actions.map(({ icon: Icon, label, cmd }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title={label}
          aria-label={label}
          disabled={disabled || loading}
          // `onMouseDown` neutralisé : sans cela, le clic sort le curseur du
          // document et la commande s'appliquerait à une sélection vide.
          onMouseDown={(event) => event.preventDefault()}
          onClick={run(cmd as CmdKey<unknown>)}
        >
          <Icon />
        </Button>
      ))}
      {/* CITER UNE TÂCHE, au même endroit que dans la saisie Markdown. Taper
          « @ » à la main ouvre la même liste ; le bouton ne fait que rendre le
          geste visible à qui ne le connaît pas. */}
      {onMention && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title={t.wiki.form.tools.mention}
          aria-label={t.wiki.form.tools.mention}
          disabled={disabled || loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={onMention}
        >
          <AtSign />
        </Button>
      )}
    </div>
  );
}

/** Mention en cours de frappe, repérée dans le document ProseMirror. */
interface RichMention {
  /** Position du « @ » dans le document. */
  from: number;
  /** Position du curseur. */
  to: number;
  query: string;
  top: number;
  left: number;
}

function EditorSurface({
  value,
  onChange,
  onEmptyChange,
  disabled,
  placeholder,
  tickets,
  anchorRef,
  onMentionChange,
  register,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onEmptyChange: (empty: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  tickets: TicketRef[];
  /** Boîte de référence pour positionner la liste (le conteneur `relative`). */
  anchorRef: React.RefObject<HTMLDivElement | null>;
  onMentionChange: (
    mention: RichMention | null,
    results: TicketRef[],
    activeIndex: number,
  ) => void;
  /** Expose à la barre d'outils les deux gestes qui ont besoin de la vue. */
  register: (api: {
    trigger: () => void;
    pick: (ticket: TicketRef) => void;
  }) => void;
}) {
  /**
   * L'éditeur est construit UNE FOIS (cf. l'en-tête). Ce qu'il doit lire ensuite
   * passe donc par des références : une fermeture posée à la construction verrait
   * sinon éternellement le premier rendu.
   *
   * Les références sont synchronisées dans un EFFET, jamais pendant le rendu :
   * y écrire rendrait le composant impur, et le compilateur React le refuse.
   */
  const mentionRef = useRef<RichMention | null>(null);
  const resultsRef = useRef<TicketRef[]>([]);
  const indexRef = useRef(0);
  const viewRef = useRef<EditorView | null>(null);
  const ticketsRef = useRef(tickets);
  const notifyRef = useRef(onMentionChange);
  useEffect(() => {
    ticketsRef.current = tickets;
    notifyRef.current = onMentionChange;
  });

  const clear = useCallback(() => {
    mentionRef.current = null;
    resultsRef.current = [];
    indexRef.current = 0;
    notifyRef.current(null, [], 0);
  }, []);

  const pick = useCallback(
    (ticket: TicketRef) => {
      const view = viewRef.current;
      const mention = mentionRef.current;
      if (!view || !mention) return;
      view.dispatch(
        view.state.tr.insertText(`@${ticket.key} `, mention.from, mention.to),
      );
      view.focus();
      clear();
    },
    [clear],
  );

  /**
   * Recalcule la mention à partir de la sélection courante.
   *
   * Le texte examiné est celui du BLOC courant jusqu'au curseur : `detectMention`
   * - le même que pour le Markdown brut - y retrouve le « @ » et sa requête. Les
   * nœuds atomiques sont remplacés par un caractère unique pour que les décalages
   * restent alignés sur les positions du document.
   */
  const refresh = useCallback(
    (view: EditorView) => {
      const { selection } = view.state;
      if (!selection.empty) return clear();
      const $from = selection.$from;
      if (!$from.parent.isTextblock) return clear();
      const textBefore = $from.parent.textBetween(
        0,
        $from.parentOffset,
        undefined,
        "\ufffc",
      );
      const found = detectMention(textBefore, textBefore.length);
      if (!found) return clear();

      const results = rankTickets(ticketsRef.current, found.query);
      if (results.length === 0) return clear();

      const from = $from.pos - ($from.parentOffset - found.start);
      const coords = view.coordsAtPos(from);
      const box = anchorRef.current?.getBoundingClientRect();
      const mention: RichMention = {
        from,
        to: $from.pos,
        query: found.query,
        top: box ? coords.bottom - box.top + 4 : coords.bottom + 4,
        left: box
          ? Math.max(
              0,
              Math.min(coords.left - box.left, box.width - MENTION_LIST_WIDTH),
            )
          : coords.left,
      };
      mentionRef.current = mention;
      resultsRef.current = results;
      indexRef.current = Math.min(indexRef.current, results.length - 1);
      notifyRef.current(mention, results, indexRef.current);
    },
    [anchorRef, clear],
  );

  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          ctx.set(defaultValueCtx, value);
          ctx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => !disabled,
            attributes: {
              class: CONTENT_CLASS,
              "aria-label": placeholder ?? "",
              // Lu par le CSS de l'invite : un éditeur vide doit dire ce qu'on
              // attend, pas offrir un rectangle muet.
              "data-placeholder": placeholder ?? "",
            },
            /**
             * Le PLUGIN ne voit pas la perte de focus : sortir de l'éditeur ne
             * change ni le document ni la sélection, et la liste restait
             * ouverte au-dessus d'un champ qu'elle ne concernait plus.
             *
             * Choisir une proposition à la souris ne déclenche pas ce cas : la
             * liste neutralise `mousedown`, le focus ne quitte donc jamais
             * l'éditeur.
             */
            handleDOMEvents: {
              ...prev.handleDOMEvents,
              blur: () => {
                clear();
                return false;
              },
            },
            /**
             * Tant que la liste est ouverte, elle CONSOMME les touches de
             * navigation : sans cela, Entrée couperait le paragraphe sous la
             * liste et les flèches déplaceraient le curseur au lieu de changer
             * de proposition.
             */
            handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
              const mention = mentionRef.current;
              const results = resultsRef.current;
              if (!mention || results.length === 0) return false;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const step = event.key === "ArrowDown" ? 1 : -1;
                indexRef.current =
                  (indexRef.current + step + results.length) % results.length;
                notifyRef.current(mention, results, indexRef.current);
                return true;
              }
              if (event.key === "Enter" || event.key === "Tab") {
                pick(results[Math.min(indexRef.current, results.length - 1)]);
                return true;
              }
              if (event.key === "Escape") {
                clear();
                return true;
              }
              return false;
            },
          }));
          ctx.get(listenerCtx).markdownUpdated((_, markdown, previous) => {
            // Le premier événement rejoue la valeur initiale : le laisser passer
            // marquerait le formulaire comme modifié sans que rien ne le soit.
            if (previous !== undefined && markdown !== previous) onChange(markdown);
            onEmptyChange(!markdown.trim());
          });
          register({
            trigger: () => insertAt(ctx.get(editorViewCtx)),
            pick,
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener)
        /**
         * Plugin ProseMirror plutôt qu'un écouteur de frappe : sa méthode
         * `update` est appelée à CHAQUE changement de vue - texte saisi, mais
         * aussi flèche, clic, ou sélection posée autrement. Se contenter du
         * clavier laisserait la liste ouverte après un clic ailleurs.
         */
        .use(
          $prose(
            () =>
              new Plugin({
                view: () => ({
                  update: (view) => {
                    viewRef.current = view;
                    refresh(view);
                  },
                  destroy: clear,
                }),
              }),
          ),
        ),
    // Volontairement sans dépendances : l'éditeur ne se reconstruit pas à chaque
    // frappe (cf. l'en-tête, « non contrôlé après montage »). `pick`, `clear` et
    // `refresh` sont stables, les fermetures ci-dessus restent donc justes.
    [],
  );

  return <Milkdown />;
}

/**
 * Insère un « @ » au curseur, ce qui ouvre la liste par le chemin ordinaire.
 * Une espace est glissée devant s'il colle à un mot : « note@ » n'est pas une
 * mention, et `detectMention` a raison de le refuser.
 */
function insertAt(view: EditorView) {
  const { $from, empty } = view.state.selection;
  if (!empty) return;
  const before = $from.parent.textBetween(
    Math.max(0, $from.parentOffset - 1),
    $from.parentOffset,
  );
  const text = /[A-Za-z0-9]/.test(before) ? " @" : "@";
  view.dispatch(view.state.tr.insertText(text, $from.pos, $from.pos));
  view.focus();
}

export function WysiwygEditor({
  value,
  onChange,
  disabled,
  placeholder,
  tickets = [],
}: {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /**
   * Tickets citables. Vide = pas d'autocomplétion, et pas de bouton « @ » :
   * une surface qui n'a rien à citer ne doit pas en proposer le geste.
   */
  tickets?: TicketRef[];
}) {
  const t = useDict();
  const [empty, setEmpty] = useState(() => !value.trim());
  const [mention, setMention] = useState<RichMention | null>(null);
  const [results, setResults] = useState<TicketRef[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  /** Gestes exposés par la surface une fois l'éditeur construit. */
  const api = useRef<{
    trigger: () => void;
    pick: (ticket: TicketRef) => void;
  } | null>(null);

  return (
    <MilkdownProvider>
      {/* UN SEUL cadre, qui englobe barre d'outils et saisie. Le composant rend
          un unique élément : sans cela, un `space-y-*` du parent viendrait
          glisser une gouttière entre les deux et les désolidariser.
          `relative` : la liste des mentions se positionne par rapport à lui. */}
      <div
        ref={anchorRef}
        data-empty={empty ? "true" : undefined}
        className="relative rounded-md border border-input focus-within:ring-2 focus-within:ring-ring"
      >
        <Toolbar
          disabled={disabled}
          onMention={
            tickets.length > 0 ? () => api.current?.trigger() : undefined
          }
        />
        <EditorSurface
          value={value}
          onChange={onChange}
          onEmptyChange={setEmpty}
          disabled={disabled}
          placeholder={placeholder}
          tickets={tickets}
          anchorRef={anchorRef}
          onMentionChange={(next, list, index) => {
            setMention(next);
            setResults(list);
            setActiveIndex(index);
          }}
          register={(next) => {
            api.current = next;
          }}
        />
        {mention && (
          <MentionList
            results={results}
            activeIndex={activeIndex}
            label={t.wiki.form.tools.mention}
            style={{ top: mention.top, left: mention.left }}
            onPick={(ticket) => api.current?.pick(ticket)}
          />
        )}
      </div>
    </MilkdownProvider>
  );
}

export default WysiwygEditor;
