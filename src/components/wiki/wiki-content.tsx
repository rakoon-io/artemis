import Link from "next/link";
import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { rehypeWikiHighlight } from "@/lib/wiki-highlight";
import { cn } from "@/lib/utils";
import { extractOutline } from "@/lib/markdown-outline";
import { TicketHoverLink, type TicketHint } from "./ticket-hover-link";
import { linkifyTicketKeys } from "@/lib/wiki-markdown";
import { scanCallouts } from "@/lib/wiki-callouts";
import { stripEditorArtifacts } from "@/lib/markdown-artifacts";
import { readImageWidth } from "@/lib/wiki-image-size";
import { CalloutTitle } from "./callout-title";

/**
 * Rend le contenu d'une page de wiki en **Markdown étendu** (GFM : titres, gras,
 * listes, tâches, tableaux, code, citations, liens...). Les citations de tickets
 * (RKN-123) deviennent des liens vers le ticket. Le HTML brut n'est pas interprété
 * (react-markdown échappe le HTML) : aucun risque XSS.
 */
export function WikiContent({
  content,
  projectKey,
  ticketMap,
  ticketHints,
  className,
}: {
  content: string;
  projectKey: string;
  /** Clé de ticket en MAJUSCULES vers son identifiant. */
  ticketMap: Record<string, string>;
  /**
   * Titre et assigné de chaque ticket, indexés par IDENTIFIANT (c'est lui que
   * porte le lien produit par `linkifyTicketKeys`). Facultatif : sans lui, les
   * citations restent de simples liens - le rendu ne se dégrade pas.
   */
  ticketHints?: Record<string, TicketHint>;
  className?: string;
}) {
  // Les ENCARTS sont repérés AVANT la liaison des citations : celle-ci ne
  // change aucune ligne, les positions restent donc valables. L'inverse aurait
  // été vrai aussi, mais le faire d'abord garde la lecture des marqueurs sur le
  // texte tel que l'auteur l'a écrit.
  //
  // Le nettoyage passe en premier : les pages enregistrées avant qu'on ne le
  // corrige portent encore les « <br /> » de l'éditeur riche, qui s'afficheraient
  // en toutes lettres. Il vide la ligne sans la retirer, les repères de ligne
  // ci-dessous restent donc justes.
  const callouts = scanCallouts(stripEditorArtifacts(content));
  const source = linkifyTicketKeys(callouts.content, ticketMap, projectKey);

  // Ancres de section, pour que le sommaire ait où pointer.
  //
  // Elles sont calculées sur le contenu BRUT, jamais sur le texte lié : un titre
  // qui cite un ticket (« ## Suivi RKN-2 ») voit sa clef remplacée par un lien
  // Markdown, et l'ancre dérivée de ce texte-là ne correspondrait plus à celle
  // du sommaire. La liaison n'ajoutant ni ne retirant aucun titre, la
  // correspondance par POSITION reste exacte.
  const anchorByLine = new Map(
    extractOutline(callouts.content).map((head) => [head.line, head.anchor]),
  );
  const heading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    const Tag = `h${level}` as const;
    return function Heading({
      node,
      children,
    }: {
      node?: { position?: { start?: { line?: number } } };
      children?: ReactNode;
    }) {
      const line = node?.position?.start?.line;
      return (
        <Tag id={line ? anchorByLine.get(line) : undefined} className="scroll-mt-6">
          {children}
        </Tag>
      );
    };
  };

  const components: Components = {
    /**
     * ENCART ou citation ordinaire, tranché par la LIGNE de départ - jamais par
     * le contenu, qui ne porte plus le marqueur (cf. `@/lib/wiki-callouts`).
     */
    blockquote({ node, children }) {
      const line = node?.position?.start?.line;
      const kind = line ? callouts.byLine.get(line) : undefined;
      if (!kind) return <blockquote>{children}</blockquote>;
      return (
        <div className={cn("wiki-callout", `wiki-callout-${kind}`)}>
          <CalloutTitle kind={kind} />
          {children}
        </div>
      );
    },
    /**
     * IMAGE, à la largeur demandée par son adresse (cf. `@/lib/wiki-image-size`).
     *
     * La largeur est posée en STYLE et non en attribut `width` : conjuguée au
     * `max-width: 100%` de la feuille de style, elle cède la place sur un écran
     * étroit au lieu de déborder. L'attribut HTML, lui, l'aurait emporté.
     */
    img({ src, alt, title }) {
      const asked = readImageWidth(typeof src === "string" ? src : "");
      return (
        /* Balise `<img>` ordinaire : les adresses sont arbitraires - fichiers
           déposés ou images externes -, et l'optimiseur de Next exige une liste
           de domaines qu'un wiki ne peut pas prévoir. */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={asked.src}
          alt={alt ?? ""}
          title={title}
          loading="lazy"
          style={asked.width ? { width: `${asked.width}px` } : undefined}
        />
      );
    },
    h1: heading(1),
    h2: heading(2),
    h3: heading(3),
    h4: heading(4),
    h5: heading(5),
    h6: heading(6),
    a({ href, children }) {
      const url = href ?? "";
      if (url.startsWith("/")) {
        // Citation de ticket : on retrouve l'identifiant dans l'adresse
        // fabriquée par `linkifyTicketKeys`, et l'on greffe l'infobulle.
        const ticketId = /\/tickets\/([^/?#]+)$/.exec(url)?.[1];
        const hint = ticketId ? ticketHints?.[ticketId] : undefined;
        if (hint) {
          return (
            <TicketHoverLink href={url} hint={hint}>
              {children}
            </TicketHoverLink>
          );
        }
        return <Link href={url}>{children}</Link>;
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    },
  };

  return (
    <div className={cn("wiki-prose", className)}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        /**
         * COLORATION DU CODE, calculée au rendu et non dans le navigateur : ce
         * composant s'exécute côté serveur partout où la page se lit, et n'y
         * envoie que des classes. `detect: false` : on ne colore que les blocs
         * dont la langue est déclarée - deviner produit régulièrement des
         * couleurs fausses sur un extrait de journal ou une sortie de terminal,
         * et une coloration fausse est pire qu'aucune.
         */
        rehypePlugins={[rehypeWikiHighlight]}
        components={components}
      >
        {source}
      </Markdown>
    </div>
  );
}
