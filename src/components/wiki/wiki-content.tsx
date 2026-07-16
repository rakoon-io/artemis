import Link from "next/link";
import { Fragment, type ReactNode } from "react";

/**
 * Rend le contenu d'une page de wiki (texte simple) en préservant les sauts de
 * ligne et en transformant :
 * - les citations de tickets (« RKN-123 » ou « #RKN-123 ») en liens vers le ticket,
 *   uniquement si la clé existe dans le projet ;
 * - les URL http(s) en liens.
 * Aucune interprétation HTML : le texte est rendu tel quel (pas de risque XSS).
 */
export function WikiContent({
  content,
  projectKey,
  ticketMap,
}: {
  content: string;
  projectKey: string;
  /** Clé de ticket en MAJUSCULES vers son identifiant. */
  ticketMap: Record<string, string>;
}) {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  return (
    <div className="text-sm leading-relaxed">
      {lines.map((line, i) =>
        line.trim() === "" ? (
          <div key={i} className="h-3" aria-hidden />
        ) : (
          <p key={i} className="whitespace-pre-wrap break-words">
            {renderLine(line, projectKey, ticketMap)}
          </p>
        ),
      )}
    </div>
  );
}

// URL, ou citation de ticket (# optionnel + clé projet + numéro).
const TOKEN_RE = /(https?:\/\/[^\s<]+)|(#?[A-Z][A-Z0-9]{1,9}-\d+)/g;

function renderLine(
  line: string,
  projectKey: string,
  ticketMap: Record<string, string>,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = new RegExp(TOKEN_RE);
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;

  while ((m = re.exec(line)) !== null) {
    if (m.index > last) nodes.push(line.slice(last, m.index));
    const [full, url, ticket] = m;

    if (url) {
      nodes.push(
        <a
          key={i}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="break-all text-primary underline underline-offset-2"
        >
          {url}
        </a>,
      );
    } else if (ticket) {
      const label = ticket.replace(/^#/, "");
      const id = ticketMap[label.toUpperCase()];
      if (id) {
        nodes.push(
          <Link
            key={i}
            href={`/projects/${projectKey}/tickets/${id}`}
            className="font-medium text-primary underline underline-offset-2"
          >
            {label}
          </Link>,
        );
      } else {
        // Clé inconnue : on laisse le texte brut (pas de lien mort).
        nodes.push(<Fragment key={i}>{full}</Fragment>);
      }
    }

    last = m.index + full.length;
    i += 1;
  }

  if (last < line.length) nodes.push(line.slice(last));
  return nodes;
}
