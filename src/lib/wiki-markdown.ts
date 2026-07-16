/**
 * Transforme les citations de tickets en liens Markdown vers le ticket, quand la
 * clé existe dans le projet. Syntaxes reconnues : « @RKN-123 » (mention, recommandé),
 * « #RKN-123 » et « RKN-123 ». On saute les blocs de code (```) et le code en ligne
 * (`) pour ne pas altérer le code. Une mention « @ » conserve le « @ » dans le lien.
 */
const TICKET_RE = /(@|#)?\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g;

export function linkifyTicketKeys(
  markdown: string,
  ticketMap: Record<string, string>,
  projectKey: string,
): string {
  // Alterne texte / bloc de code (les blocs sont aux indices impairs).
  return markdown
    .split(/(```[\s\S]*?```)/g)
    .map((block, blockIndex) => {
      if (blockIndex % 2 === 1) return block; // bloc de code : inchangé
      return block
        .split(/(`[^`]*`)/g)
        .map((span, spanIndex) => {
          if (spanIndex % 2 === 1) return span; // code en ligne : inchangé
          return span.replace(
            TICKET_RE,
            (full, prefix: string | undefined, key: string) => {
              const id = ticketMap[key.toUpperCase()];
              if (!id) return full;
              const label = prefix === "@" ? `@${key}` : key;
              return `[${label}](/projects/${projectKey}/tickets/${id})`;
            },
          );
        })
        .join("");
    })
    .join("");
}
