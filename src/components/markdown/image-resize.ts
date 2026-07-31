import { imageAttr, imageSchema } from "@milkdown/kit/preset/commonmark";

import type { Node as ProseNode } from "@milkdown/kit/prose/model";
import type {
  EditorView,
  NodeView,
  NodeViewConstructor,
} from "@milkdown/kit/prose/view";
import {
  MIN_IMAGE_WIDTH,
  readImageWidth,
  withImageWidth,
} from "@/lib/wiki-image-size";

/**
 * REDIMENSIONNER UNE IMAGE en la tirant par le coin.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA LARGEUR N'EST PAS DANS LE DOCUMENT, ELLE EST DANS L'ADRESSE
 *
 * Markdown n'a pas de place pour une taille. Elle voyage donc dans l'adresse de
 * l'image - `?w=480` -, qui est la nôtre (cf. `@/lib/wiki-image-size`). Le
 * document ProseMirror, lui, la porte dans un attribut : on la lit à
 * l'ouverture, on la réécrit à l'enregistrement. Un attribut se modifie en une
 * transaction, là où réécrire l'adresse à chaque pixel ferait recharger l'image.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE POIGNÉE, PAS UNE BOÎTE DE DIALOGUE
 *
 * Le geste attendu est de tirer le coin. Pendant le glissement, seul le STYLE de
 * l'image change - aucune transaction n'est émise : une par pixel parcouru
 * remplirait l'historique et rendrait l'annulation inutilisable. La transaction
 * unique est émise au relâchement.
 *
 * Un double-clic sur la poignée rend à l'image sa taille propre : sans cela, une
 * image trop réduite n'aurait plus de coin assez grand pour être reprise.
 */

/** Largeur utile de la zone d'édition : on ne dépasse pas la colonne. */
function availableWidth(view: EditorView): number {
  const style = getComputedStyle(view.dom);
  const padding =
    parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
  return Math.max(MIN_IMAGE_WIDTH, view.dom.clientWidth - padding);
}

/** Largeur retenue par le nœud, si elle est utilisable. */
function widthOf(node: ProseNode): number | null {
  const raw: unknown = node.attrs?.width;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

/**
 * Le schéma d'image du préréglage, augmenté d'une largeur lue depuis l'adresse
 * et réécrite dedans. L'adresse portée par le document reste PROPRE : la largeur
 * n'y revient qu'à la sérialisation, sinon elle s'y accumulerait.
 */
export function imageWithWidth() {
  return imageSchema.extendSchema((prev) => (ctx) => {
    const base = prev(ctx);
    return {
      ...base,
      attrs: { ...base.attrs, width: { default: null } },
      parseDOM: [
        {
          tag: "img[src]",
          getAttrs: (dom: HTMLElement) => {
            const asked = readImageWidth(dom.getAttribute("src") ?? "");
            const attribute = Number(dom.getAttribute("width"));
            return {
              src: asked.src,
              alt: dom.getAttribute("alt") ?? "",
              title: dom.getAttribute("title") ?? dom.getAttribute("alt") ?? "",
              width:
                asked.width ?? (Number.isFinite(attribute) ? attribute : null),
            };
          },
        },
      ],
      toDOM: (node: ProseNode) => {
        const width = widthOf(node);
        return [
          "img",
          {
            ...ctx.get(imageAttr.key)(node),
            src: String(node.attrs.src ?? ""),
            alt: String(node.attrs.alt ?? ""),
            title: String(node.attrs.title ?? ""),
            ...(width ? { style: `width:${width}px` } : {}),
          },
        ];
      },
      parseMarkdown: {
        match: base.parseMarkdown.match,
        runner: (state, node, type) => {
          const asked = readImageWidth(String(node.url ?? ""));
          state.addNode(type, {
            src: asked.src,
            alt: node.alt,
            title: node.title,
            width: asked.width,
          });
        },
      },
      toMarkdown: {
        match: base.toMarkdown.match,
        runner: (state, node) => {
          state.addNode("image", undefined, undefined, {
            title: node.attrs.title,
            url: withImageWidth(String(node.attrs.src ?? ""), widthOf(node)),
            alt: node.attrs.alt,
          });
        },
      },
    };
  });
}

/**
 * Vue du nœud image : l'image, et la poignée qui la redimensionne.
 *
 * Posée dans les OPTIONS de la vue plutôt que par le greffon `$view` de
 * Milkdown : celui-ci n'attend que le schéma, quand la vue de l'éditeur, elle,
 * n'attend pas le greffon - la vue était donc construite avant que la nôtre ne
 * soit enregistrée, et l'image s'affichait sans poignée. Les options sont
 * appliquées en dernier, ce qui ne laisse aucune place à l'ordre d'exécution.
 */
export function imageResizeNodeView(gripTitle: string): NodeViewConstructor {
  return (node, view, getPos) => {
    const dom = document.createElement("span");
    dom.className = "wiki-image-frame";

    const img = document.createElement("img");
    const grip = document.createElement("span");
    grip.className = "wiki-image-grip";
    grip.title = gripTitle;
    grip.setAttribute("aria-hidden", "true");
    grip.draggable = false;
    dom.append(img, grip);

    let current = node;
    const paint = (n: ProseNode) => {
      img.src = String(n.attrs.src ?? "");
      img.alt = String(n.attrs.alt ?? "");
      const title = String(n.attrs.title ?? "");
      if (title) img.title = title;
      else img.removeAttribute("title");
      const width = widthOf(n);
      img.style.width = width ? `${width}px` : "";
    };
    paint(node);

    /** Écrit la largeur dans le document - une seule transaction. */
    const commit = (width: number | null) => {
      const pos = getPos();
      if (pos === undefined) return;
      view.dispatch(
        view.state.tr.setNodeMarkup(pos, undefined, {
          ...current.attrs,
          width,
        }),
      );
    };

    let resizing = false;
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      // Sans cela, le nœud image - qui est déplaçable - partirait en
      // glisser-déposer au lieu de se redimensionner.
      event.preventDefault();
      event.stopPropagation();

      const startX = event.clientX;
      const startWidth = img.getBoundingClientRect().width;
      const max = availableWidth(view);
      let width = startWidth;
      resizing = true;
      grip.setPointerCapture(event.pointerId);

      const onMove = (move: PointerEvent) => {
        width = Math.min(
          max,
          Math.max(MIN_IMAGE_WIDTH, startWidth + (move.clientX - startX)),
        );
        img.style.width = `${Math.round(width)}px`;
      };
      const onUp = () => {
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onUp);
        grip.removeEventListener("pointercancel", onUp);
        resizing = false;
        commit(Math.round(width));
      };
      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onUp);
      grip.addEventListener("pointercancel", onUp);
    };

    const onDoubleClick = (event: MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();
      commit(null);
    };

    grip.addEventListener("pointerdown", onPointerDown);
    grip.addEventListener("dblclick", onDoubleClick);

    const nodeView: NodeView = {
      dom,
      update(next) {
        if (next.type !== current.type) return false;
        current = next;
        paint(next);
        return true;
      },
      // Tout ce qui se passe sur la poignée nous appartient : ProseMirror ne
      // doit ni le lire comme une saisie, ni y voir le début d'un déplacement.
      stopEvent: (event) => resizing || event.target === grip,
      ignoreMutation: () => true,
      destroy() {
        grip.removeEventListener("pointerdown", onPointerDown);
        grip.removeEventListener("dblclick", onDoubleClick);
      },
    };
    return nodeView;
  };
}
