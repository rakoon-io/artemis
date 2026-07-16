/**
 * Transforme les citations de tickets (« RKN-123 », « #RKN-123 ») en liens
 * Markdown vers le ticket, quand la clé existe dans le projet. On saute les blocs
 * de code (```) et le code en ligne (`) pour ne pas altérer le code.
 */
const TICKET_RE = /#?\b([A-Z][A-Z0-9]{1,9}-\d+)\b/g;

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
          return span.replace(TICKET_RE, (full, key: string) => {
            const id = ticketMap[key.toUpperCase()];
            return id ? `[${key}](/projects/${projectKey}/tickets/${id})` : full;
          });
        })
        .join("");
    })
    .join("");
}
