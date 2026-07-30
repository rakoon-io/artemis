import Link from "next/link";
import Markdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";
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

  const components: Components = {
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
