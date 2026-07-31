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
  return DANGEROUS_CONTENT_TYPES.has(baseType(contentType)) ||
    contentType.trim().toLowerCase().includes("script");
}

/** Type de base, sans paramètres (« text/html; charset=utf-8 » → « text/html »). */
export function baseType(contentType: string): string {
  return contentType.trim().toLowerCase().split(";")[0]?.trim() ?? "";
}

/**
 * CE QUE L'ON ACCEPTE D'AFFICHER DANS L'ONGLET, et rien d'autre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * UNE LISTE BLANCHE, PARCE QU'UNE LISTE NOIRE SE CONTOURNE
 *
 * La liste noire ci-dessus reste utile : elle refuse le fichier à l'entrée, en
 * le disant. Mais elle ne peut pas décider ce qu'on SERT, parce qu'elle énumère
 * le danger connu - trois types -, et que le danger connu grandit. `text/xml`
 * portant une feuille XSLT s'exécute ; `application/xhtml+xml` est bloqué mais
 * pas ses cousins ; demain un autre type deviendra rendu.
 *
 * Ici, la question est inversée : QU'EST-CE QU'ON SAIT SÛR d'afficher en place ?
 * Des images matricielles et des PDF. Tout le reste part en téléchargement, où
 * le navigateur ne l'interprète pas - un HTML téléchargé est un fichier, pas une
 * page. Un type inconnu n'est donc plus une brèche, seulement un fichier.
 *
 * Pas de SVG dans cette liste, jamais : c'est un document qui exécute du script.
 */
const INLINE_SAFE = new Set([
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "image/avif",
  "application/pdf",
]);

/**
 * Comment servir ce fichier : le TYPE annoncé et la DISPOSITION.
 *
 * Le type renvoyé n'est pas celui de la base quand on ne le juge pas sûr : une
 * chaîne fournie par le client au téléversement continuerait sinon de piloter
 * l'interprétation du navigateur des mois plus tard. `application/octet-stream`
 * ne s'interprète pas.
 */
export function safeServing(contentType: string): {
  type: string;
  disposition: "inline" | "attachment";
} {
  const base = baseType(contentType);
  return INLINE_SAFE.has(base)
    ? { type: base, disposition: "inline" }
    : { type: "application/octet-stream", disposition: "attachment" };
}

/**
 * En-tête `Content-Disposition`, encodé pour supporter n'importe quel nom.
 *
 * L'ancien code n'ôtait que les guillemets et les sauts de ligne. Aucune
 * injection d'en-tête possible, donc - mais un nom contenant un caractère
 * au-delà de l'ASCII (un idéogramme, un émoji, une pièce jointe nommée en
 * arabe) produisait une valeur que la couche HTTP de Node REFUSE, hors du
 * `try` : le téléchargement répondait 500 au lieu du fichier.
 *
 * Les deux formes coexistent comme le prévoit la RFC 6266 : `filename` en ASCII
 * replié pour les clients anciens, `filename*` en UTF-8 pour les autres, qui le
 * préfèrent.
 */
export function contentDisposition(
  disposition: "inline" | "attachment",
  filename: string,
): string {
  const propre = filename.replace(/[\r\n"]/g, "").trim() || "fichier";
  const ascii = propre.replace(/[^\x20-\x7e]/g, "_");
  return `${disposition}; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(propre)}`;
}
