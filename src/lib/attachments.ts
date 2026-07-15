/**
 * Utilitaires pièces jointes partagés entre les routes `presign` et `upload`.
 * Module pur (aucun import Node) : réutilisable côté serveur sans surcoût.
 */

/**
 * Types de contenu refusés à l'upload (risque XSS au rendu inline / téléchargement).
 * Denylist : HTML, SVG, XHTML, et tout type contenant « script ».
 */
const DANGEROUS_CONTENT_TYPES = new Set([
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
]);

export function isDangerousContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  const base = normalized.split(";")[0]?.trim() ?? "";
  return DANGEROUS_CONTENT_TYPES.has(base) || normalized.includes("script");
}
