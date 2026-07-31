"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  List,
  ListOrdered,
  OctagonAlert,
  Quote,
  Strikethrough,
} from "lucide-react";
import {
  Editor,
  defaultValueCtx,
  editorViewCtx,
  editorViewOptionsCtx,
  rootCtx,
  serializerCtx,
} from "@milkdown/kit/core";
import { $prose } from "@milkdown/kit/utils";
import { Plugin, Selection } from "@milkdown/kit/prose/state";
import type { EditorView } from "@milkdown/kit/prose/view";
import { commonmark } from "@milkdown/kit/preset/commonmark";
import { gfm } from "@milkdown/kit/preset/gfm";
import { history } from "@milkdown/kit/plugin/history";
import { callCommand } from "@milkdown/kit/utils";
import { wrapIn } from "@milkdown/kit/prose/commands";
import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import {
  blockquoteAttr,
  blockquoteSchema,
  imageSchema,
  remarkPreserveEmptyLinePlugin,
  toggleEmphasisCommand,
  toggleInlineCodeCommand,
  toggleStrongCommand,
  wrapInHeadingCommand,
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
  CALLOUT_MARKER,
  isCalloutKind,
  splitCalloutMarker,
  type CalloutKind,
  type MarkdownNodeLike,
} from "@/lib/wiki-callouts";
import { stripEditorArtifacts } from "@/lib/markdown-artifacts";
import { imageResizeNodeView, imageWithWidth } from "./image-resize";
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

/* ─────────────────────────────────────────────────────────────────────────────
   ENCART = CITATION + GENRE

   Un encart s'enregistre comme une citation dont la première ligne porte un
   marqueur (cf. `@/lib/wiki-callouts`). L'éditeur affichait donc « [!WARNING] »
   en toutes lettres et en anglais : on cliquait « Attention » et l'on voyait
   apparaître du jargon dans son texte. Une commande de mise en forme ne doit
   pas laisser sa syntaxe sur la table.

   Le marqueur est donc LU à l'ouverture et RÉÉCRIT à l'enregistrement, sans
   jamais exister dans le document. Le genre vit dans un attribut de la
   citation, et l'affichage en tire le cadre coloré et son intitulé - ce que
   l'on verra à la lecture.

   Pourquoi étendre la citation plutôt que créer un nœud « encart » : parce que
   c'en est une. Tout ce que ProseMirror sait déjà faire d'une citation - la
   fabriquer, en sortir, l'imbriquer, la coller - continue de valoir, et un
   encart dont on retire le genre redevient une citation ordinaire sans que rien
   ne se convertisse.
   ───────────────────────────────────────────────────────────────────────────── */

/** Genre porté par un nœud, si c'en est un connu. */
function calloutKindOf(node: ProseNode): CalloutKind | null {
  const kind: unknown = node.attrs?.kind;
  return isCalloutKind(kind) ? kind : null;
}

/**
 * Les nœuds mdast de Milkdown déclarent leurs champs en `unknown` (signature
 * d'index) ; `splitCalloutMarker` n'en lit que le type et le texte. La
 * conversion est donc sûre, et cantonnée à ces deux fonctions.
 */
const asMarkdownNodes = (nodes: unknown): MarkdownNodeLike[] =>
  (nodes ?? []) as MarkdownNodeLike[];

function calloutBlockquote(labels: Record<CalloutKind, string>) {
  return blockquoteSchema.extendSchema((prev) => (ctx) => {
    const base = prev(ctx);
    return {
      ...base,
      attrs: { kind: { default: null } },
      parseDOM: [
        {
          tag: "blockquote",
          getAttrs: (dom: HTMLElement) => {
            const kind = dom.getAttribute("data-callout");
            return { kind: isCalloutKind(kind) ? kind : null };
          },
        },
      ],
      toDOM: (node: ProseNode) => {
        const attrs = ctx.get(blockquoteAttr.key)(node) as Record<string, string>;
        const kind = calloutKindOf(node);
        if (!kind) return ["blockquote", attrs, 0];
        return [
          "blockquote",
          {
            ...attrs,
            "data-callout": kind,
            // L'intitulé est traduit ici et dessiné par le style : le document,
            // lui, n'en porte pas trace.
            "data-label": labels[kind],
            class: [attrs.class, "wiki-callout", `wiki-callout-${kind}`]
              .filter(Boolean)
              .join(" "),
          },
          0,
        ];
      },
      parseMarkdown: {
        match: base.parseMarkdown.match,
        runner: (state, node, type) => {
          const split = splitCalloutMarker(asMarkdownNodes(node.children));
          state.openNode(type, split ? { kind: split.kind } : undefined);
          state.next((split ? split.body : asMarkdownNodes(node.children)) as never);
          state.closeNode();
        },
      },
      toMarkdown: {
        match: base.toMarkdown.match,
        runner: (state, node) => {
          state.openNode("blockquote");
          const kind = calloutKindOf(node);
          if (kind) {
            state.openNode("paragraph");
            // Nœud « html » et non « text » : un crochet en début de ligne
            // serait échappé - « \[!NOTE] » -, et la marque ressortirait à la
            // lecture brute du Markdown, dans un export ou un terminal.
            state.addNode("html", undefined, `[!${CALLOUT_MARKER[kind]}]`);
            state.closeNode();
          }
          state.next(node.content);
          state.closeNode();
        },
      },
    };
  });
}

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
    // `CmdKey<unknown>` : la charge utile varie d'une commande à l'autre. Les
    // titres en attendent une - leur niveau -, les autres non.
    (command: CmdKey<unknown>, payload?: unknown) => () => {
      if (loading) return;
      getEditor()?.action(callCommand(command, payload));
    },
    [loading, getEditor],
  );

  /**
   * ENCART : on pose un GENRE sur la citation qui contient le curseur, ou l'on
   * enveloppe la sélection dans une citation qui le porte.
   *
   * Rien n'est écrit dans le texte - le marqueur est réécrit à
   * l'enregistrement. Le bouton bascule : le presser sur un encart du même
   * genre le ramène à une citation ordinaire, ce qui donne de quoi défaire sans
   * chercher.
   */
  const callout = useCallback(
    (kind: CalloutKind) => () => {
      if (loading) return;
      getEditor()?.action((ctx) => {
        const view = ctx.get(editorViewCtx);
        const quote = view.state.schema.nodes.blockquote;
        if (!quote) return;

        const { $from } = view.state.selection;
        for (let depth = $from.depth; depth > 0; depth -= 1) {
          const node = $from.node(depth);
          if (node.type !== quote) continue;
          const next = node.attrs.kind === kind ? null : kind;
          view.dispatch(
            view.state.tr.setNodeMarkup($from.before(depth), undefined, {
              ...node.attrs,
              kind: next,
            }),
          );
          view.focus();
          return;
        }

        wrapIn(quote, { kind })(view.state, view.dispatch);
        view.focus();
      });
    },
    [loading, getEditor],
  );

  const headings = [
    { icon: Heading1, label: t.wiki.form.tools.h1, level: 1 },
    { icon: Heading2, label: t.wiki.form.tools.h2, level: 2 },
    { icon: Heading3, label: t.wiki.form.tools.h3, level: 3 },
    { icon: Heading4, label: t.wiki.form.tools.h4, level: 4 },
  ] as const;

  const callouts = [
    { icon: Info, label: t.wiki.callouts.note, kind: "note" },
    { icon: AlertTriangle, label: t.wiki.callouts.warning, kind: "warning" },
    { icon: OctagonAlert, label: t.wiki.callouts.important, kind: "important" },
  ] as const;

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
      {headings.map(({ icon: Icon, label, level }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title={label}
          aria-label={label}
          disabled={disabled || loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={run(wrapInHeadingCommand.key as CmdKey<unknown>, level)}
        >
          <Icon />
        </Button>
      ))}
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
      {callouts.map(({ icon: Icon, label, kind }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon"
          className="size-8"
          title={label}
          aria-label={label}
          disabled={disabled || loading}
          onMouseDown={(event) => event.preventDefault()}
          onClick={callout(kind)}
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
  id,
  value,
  onChange,
  onEmptyChange,
  disabled,
  placeholder,
  tickets,
  onPasteImage,
  anchorRef,
  onMentionChange,
  register,
}: {
  /** Porté par la zone de saisie, pour qu'un `<Label>` externe la désigne. */
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  onEmptyChange: (empty: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
  tickets: TicketRef[];
  onPasteImage?: (file: File) => Promise<{ src: string; alt: string } | null>;
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
  const pasteRef = useRef(onPasteImage);
  const changeRef = useRef(onChange);
  const emptyRef = useRef(onEmptyChange);
  useEffect(() => {
    ticketsRef.current = tickets;
    notifyRef.current = onMentionChange;
    pasteRef.current = onPasteImage;
    changeRef.current = onChange;
    emptyRef.current = onEmptyChange;
  });

  /**
   * Publie le texte du document.
   *
   * Appelé à CHAQUE frappe, sans temporisation. Le greffon `listener` de
   * Milkdown, lui, attend 200 ms de silence avant de sérialiser : qui tapait
   * puis validait aussitôt - ⌘/Ctrl + Entrée, ou un clic rapide sur
   * « Enregistrer » - perdait ses derniers mots, la valeur remontée étant en
   * retard sur ce qu'il voyait. Constaté, reproduit, et sans remède du côté de
   * l'appelant : une transmission par état React ne peut pas rattraper son
   * retard dans l'événement même qui déclenche l'enregistrement.
   *
   * La sérialisation à chaque frappe est ce que fait déjà la saisie Markdown,
   * dont le champ est contrôlé. Mesurée sur la plus grosse page du wiki
   * (3 800 caractères, tableaux et blocs de code compris) et en mode
   * développement, donc au pire : 0,8 ms en médiane, 3,8 ms au pire - un
   * seizième d'image à l'écran.
   */
  const publish = useCallback((markdown: string) => {
    const cleaned = stripEditorArtifacts(markdown);
    changeRef.current(cleaned);
    emptyRef.current(!cleaned.trim());
  }, []);

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

  /**
   * Intitulés des encarts, figés à la construction : ils sont dessinés par le
   * schéma, que l'éditeur ne rebâtit pas (cf. l'en-tête). Changer de langue
   * recharge l'application, ils suivent donc au montage suivant.
   */
  const t = useDict();
  const calloutLabels: Record<CalloutKind, string> = {
    note: t.wiki.callouts.note,
    warning: t.wiki.callouts.warning,
    important: t.wiki.callouts.important,
  };

  useEditor(
    (root) =>
      Editor.make()
        .config((ctx) => {
          ctx.set(rootCtx, root);
          // Nettoyé à l'entrée aussi : une page enregistrée avant que l'on ne
          // corrige cela porte encore des `<br />`, et sans la conservation des
          // lignes vides, Milkdown les afficherait en toutes lettres dans la
          // zone de saisie. Rouvrir puis enregistrer une vieille page suffit
          // désormais à la nettoyer.
          ctx.set(defaultValueCtx, stripEditorArtifacts(value));
          ctx.update(editorViewOptionsCtx, (prev) => ({
            ...prev,
            editable: () => !disabled,
            /* L'IMAGE se laisse tirer par le coin (cf. `./image-resize`). Aucun
               des deux préréglages n'installe de vue de nœud : rien n'est
               écrasé ici. */
            nodeViews: {
              ...prev.nodeViews,
              image: imageResizeNodeView(t.wiki.form.tools.resizeImage),
            },
            attributes: {
              ...(id ? { id } : {}),
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
             * COLLAGE D'IMAGE. On insère un VRAI NŒUD image, et non le texte
             * « ![](…) » : écrit tel quel dans un document ProseMirror, il
             * ressortirait échappé à la sérialisation - « !\[\]\(…\) » -,
             * c'est-à-dire en toutes lettres au lieu d'une image.
             *
             * Le dépôt est asynchrone, la transaction ne peut donc pas se faire
             * dans la foulée : on empêche le collage ordinaire, et l'on insère
             * quand le fichier est arrivé, à la position d'alors.
             */
            handlePaste: (view: EditorView, event: ClipboardEvent) => {
              const upload = pasteRef.current;
              if (!upload || !event.clipboardData) return false;
              const images = Array.from(event.clipboardData.files).filter((f) =>
                f.type.startsWith("image/"),
              );
              if (images.length === 0) return false;
              void (async () => {
                for (const file of images) {
                  const done = await upload(file);
                  if (!done) continue;
                  const type = view.state.schema.nodes.image;
                  if (!type) continue;
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      type.create({ src: done.src, alt: done.alt }),
                    ),
                  );
                }
              })();
              return true;
            },
            /**
             * DÉPÔT D'IMAGE dans le texte, au point où on la lâche - et non à
             * l'endroit où traînait le curseur. Même chemin que le collage : le
             * fichier est déposé sur la page, puis cité par son adresse stable.
             *
             * Les autres fichiers ne sont pas pris ici : leur place est dans les
             * pièces jointes, qui ont leur propre zone. Le geste manqué ne fait
             * rien - la garde posée par ce panneau empêche le navigateur
             * d'ouvrir le fichier à la place de l'application.
             */
            handleDrop: (view: EditorView, event: DragEvent) => {
              const upload = pasteRef.current;
              const images = Array.from(event.dataTransfer?.files ?? []).filter((f) =>
                f.type.startsWith("image/"),
              );
              if (!upload || images.length === 0) return false;
              event.preventDefault();

              const at = view.posAtCoords({
                left: event.clientX,
                top: event.clientY,
              })?.pos;
              if (at !== undefined) {
                view.dispatch(
                  view.state.tr.setSelection(
                    Selection.near(view.state.doc.resolve(at)),
                  ),
                );
              }
              view.focus();
              void (async () => {
                for (const file of images) {
                  const done = await upload(file);
                  if (!done) continue;
                  const type = view.state.schema.nodes.image;
                  if (!type) continue;
                  // Insertion à la sélection COURANTE : après chaque image, elle
                  // se trouve juste derrière, les suivantes s'enchaînent donc
                  // dans l'ordre où on les a lâchées.
                  view.dispatch(
                    view.state.tr.replaceSelectionWith(
                      type.create({ src: done.src, alt: done.alt }),
                    ),
                  );
                }
              })();
              return true;
            },
            /**
             * Tant que la liste est ouverte, elle CONSOMME les touches de
             * navigation : sans cela, Entrée couperait le paragraphe sous la
             * liste et les flèches déplaceraient le curseur au lieu de changer
             * de proposition.
             *
             * Consommer, c'est aussi ARRÊTER LA PROPAGATION : le conteneur écoute
             * plus haut les raccourcis d'enregistrement, et Échap y annulerait la
             * modification en cours au lieu de simplement refermer la liste.
             */
            handleKeyDown: (_view: EditorView, event: KeyboardEvent) => {
              const mention = mentionRef.current;
              const results = resultsRef.current;
              if (!mention || results.length === 0) return false;
              const consumed = () => {
                event.stopPropagation();
                return true;
              };
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                const step = event.key === "ArrowDown" ? 1 : -1;
                indexRef.current =
                  (indexRef.current + step + results.length) % results.length;
                notifyRef.current(mention, results, indexRef.current);
                return consumed();
              }
              if (event.key === "Enter" || event.key === "Tab") {
                pick(results[Math.min(indexRef.current, results.length - 1)]);
                return consumed();
              }
              if (event.key === "Escape") {
                clear();
                return consumed();
              }
              return false;
            },
          }));
          register({
            trigger: () => insertAt(ctx.get(editorViewCtx)),
            pick,
          });
        })
        /**
         * Le préréglage MOINS deux choses, PLUS notre citation.
         *
         * LA CITATION est remplacée explicitement plutôt qu'empilée : deux
         * définitions du même nœud laisseraient dépendre le résultat de l'ordre
         * d'enregistrement. Les commandes et raccourcis du préréglage
         * continuent de fonctionner, eux résolvent la citation par son nom dans
         * le schéma final.
         *
         * LA CONSERVATION DES LIGNES VIDES est retirée. Milkdown écrit une
         * balise `<br />` pour chaque ligne vide laissée entre deux blocs, faute
         * de pouvoir l'exprimer en Markdown - où deux blocs sont TOUJOURS
         * séparés d'une ligne blanche, sans qu'il existe de façon d'en écrire
         * deux. Cette balise ressortait en toutes lettres à la lecture, le rendu
         * n'interprétant pas le HTML. Mieux vaut perdre l'espacement, qui n'est
         * pas représentable, que d'écrire du HTML dans un document Markdown.
         */
        .use(
          commonmark
            .filter(
              (plugin) =>
                !(blockquoteSchema as readonly unknown[]).includes(plugin) &&
                !(imageSchema as readonly unknown[]).includes(plugin) &&
                !(remarkPreserveEmptyLinePlugin as readonly unknown[]).includes(plugin),
            )
            .concat(calloutBlockquote(calloutLabels))
            // L'IMAGE porte sa largeur, et se laisse tirer par le coin.
            .concat(imageWithWidth()),
        )
        .use(gfm)
        .use(history)
        /**
         * Plugin ProseMirror plutôt qu'un écouteur de frappe : sa méthode
         * `update` est appelée à CHAQUE changement de vue - texte saisi, mais
         * aussi flèche, clic, ou sélection posée autrement. Se contenter du
         * clavier laisserait la liste ouverte après un clic ailleurs.
         *
         * C'est aussi d'ici que le texte est publié, le greffon `listener` de
         * Milkdown temporisant trop pour un enregistrement au clavier (cf.
         * `publish`). Le premier appel n'a pas lieu à la construction : la
         * valeur initiale ne se rejoue donc pas, et le formulaire ne se déclare
         * pas modifié avant qu'on ne le modifie.
         */
        .use(
          $prose(
            (ctx) =>
              new Plugin({
                view: () => ({
                  update: (view, previous) => {
                    viewRef.current = view;
                    refresh(view);
                    if (previous.doc.eq(view.state.doc)) return;
                    publish(ctx.get(serializerCtx)(view.state.doc));
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
  id,
  value,
  onChange,
  disabled,
  placeholder,
  tickets = [],
  onPasteImage,
}: {
  /**
   * Identifiant de la zone de saisie. Sans lui, un `<Label for=…>` posé par
   * l'appelant ne désignait plus rien dès qu'on passait en mise en forme : la
   * zone n'est pas un `<textarea>`, et l'identifiant s'arrêtait à la saisie brute.
   */
  id?: string;
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
  /** Dépose une image collée et rend de quoi la citer (cf. `MarkdownEditor`). */
  onPasteImage?: (file: File) => Promise<{ src: string; alt: string } | null>;
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
          id={id}
          value={value}
          onChange={onChange}
          onEmptyChange={setEmpty}
          disabled={disabled}
          placeholder={placeholder}
          tickets={tickets}
          onPasteImage={onPasteImage}
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
