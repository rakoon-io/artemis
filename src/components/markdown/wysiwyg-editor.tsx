"use client";

import { useCallback, useState } from "react";
import {
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
  editorViewOptionsCtx,
  rootCtx,
} from "@milkdown/kit/core";
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

function Toolbar({ disabled }: { disabled?: boolean }) {
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
    </div>
  );
}

function EditorSurface({
  value,
  onChange,
  onEmptyChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (markdown: string) => void;
  onEmptyChange: (empty: boolean) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
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
          }));
          ctx.get(listenerCtx).markdownUpdated((_, markdown, previous) => {
            // Le premier événement rejoue la valeur initiale : le laisser passer
            // marquerait le formulaire comme modifié sans que rien ne le soit.
            if (previous !== undefined && markdown !== previous) onChange(markdown);
            onEmptyChange(!markdown.trim());
          });
        })
        .use(commonmark)
        .use(gfm)
        .use(history)
        .use(listener),
    // Volontairement sans dépendances : l'éditeur ne se reconstruit pas à chaque
    // frappe (cf. l'en-tête, « non contrôlé après montage »).
    [],
  );

  return <Milkdown />;
}

export function WysiwygEditor({
  value,
  onChange,
  disabled,
  placeholder,
}: {
  value: string;
  onChange: (markdown: string) => void;
  disabled?: boolean;
  placeholder?: string;
}) {
  const [empty, setEmpty] = useState(() => !value.trim());

  return (
    <MilkdownProvider>
      {/* UN SEUL cadre, qui englobe barre d'outils et saisie. Le composant rend
          un unique élément : sans cela, un `space-y-*` du parent viendrait
          glisser une gouttière entre les deux et les désolidariser. */}
      <div
        data-empty={empty ? "true" : undefined}
        className="overflow-hidden rounded-md border border-input focus-within:ring-2 focus-within:ring-ring"
      >
        <Toolbar disabled={disabled} />
        <EditorSurface
          value={value}
          onChange={onChange}
          onEmptyChange={setEmpty}
          disabled={disabled}
          placeholder={placeholder}
        />
      </div>
    </MilkdownProvider>
  );
}

export default WysiwygEditor;
