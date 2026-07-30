import Link from "next/link";
import type { ReactNode } from "react";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
import { extractOutline } from "@/lib/markdown-outline";
import { TicketHoverLink, type TicketHint } from "./ticket-hover-link";
import { linkifyTicketKeys } from "@/lib/wiki-markdown";

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
  const source = linkifyTicketKeys(content, ticketMap, projectKey);

  // Ancres de section, pour que le sommaire ait où pointer.
  //
  // Elles sont calculées sur le contenu BRUT, jamais sur le texte lié : un titre
  // qui cite un ticket (« ## Suivi RKN-2 ») voit sa clef remplacée par un lien
  // Markdown, et l'ancre dérivée de ce texte-là ne correspondrait plus à celle
  // du sommaire. La liaison n'ajoutant ni ne retirant aucun titre, la
  // correspondance par POSITION reste exacte.
  const anchorByLine = new Map(
    extractOutline(content).map((head) => [head.line, head.anchor]),
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
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {source}
      </Markdown>
    </div>
  );
}
