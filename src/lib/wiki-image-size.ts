/**
 * TAILLE D'UNE IMAGE, portée par son ADRESSE.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI DANS L'URL
 *
 * Markdown n'a pas de place pour une largeur : `![alt](url)`, rien d'autre.
 * Trois façons de la loger, et une seule qui ne coûte rien :
 *
 *  - Le HTML `<img width>` : le rendu n'interprète pas le HTML, c'est ce qui met
 *    les pages à l'abri de l'injection. Écarté.
 *  - Le titre - `![alt](url "=480x")` - : c'est un détournement, et le titre
 *    s'affiche en INFOBULLE partout ailleurs. On lirait « =480x » en survolant
 *    l'image dans n'importe quel autre outil.
 *  - Un paramètre dans l'adresse : `?w=480`. L'adresse est la nôtre
 *    (`/api/wiki-files/…`), la route ignore ce qu'elle ne connaît pas, et un
 *    autre outil affiche simplement l'image à sa taille naturelle. Le document
 *    reste du Markdown ordinaire, sans greffon d'analyse.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI EST GARDÉ, CE QUI EST JETÉ
 *
 * Les autres paramètres sont préservés tels quels : cette fonction ne connaît
 * que `w` et n'a pas à normaliser l'adresse de quelqu'un d'autre. Un `w`
 * illisible est retiré plutôt que recopié - il ne veut rien dire, et le laisser
 * en place l'aurait fait réapparaître à chaque enregistrement.
 */

/** En deçà, l'image n'est plus qu'une vignette illisible. */
export const MIN_IMAGE_WIDTH = 40;
/** Au delà, c'est une valeur aberrante : aucun écran n'en fait usage. */
export const MAX_IMAGE_WIDTH = 4000;

export interface ImageSize {
  /** Adresse débarrassée du paramètre de largeur. */
  src: string;
  /** Largeur demandée, en pixels - `null` si l'image garde sa taille propre. */
  width: number | null;
}

/** Découpe `url#fragment` en gardant le fragment de côté. */
function splitFragment(src: string): [string, string] {
  const at = src.indexOf("#");
  return at === -1 ? [src, ""] : [src.slice(0, at), src.slice(at)];
}

export function readImageWidth(src: string): ImageSize {
  const [address, fragment] = splitFragment(src);
  const at = address.indexOf("?");
  if (at === -1) return { src, width: null };

  const base = address.slice(0, at);
  const params = address
    .slice(at + 1)
    .split("&")
    .filter(Boolean);
  const kept = params.filter((p) => !p.startsWith("w="));
  const asked = params.find((p) => p.startsWith("w="))?.slice(2);
  if (kept.length === params.length) return { src, width: null };

  const value = asked && /^\d+$/.test(asked) ? Number(asked) : NaN;
  const width =
    Number.isFinite(value) && value >= MIN_IMAGE_WIDTH && value <= MAX_IMAGE_WIDTH
      ? value
      : null;
  const query = kept.length > 0 ? `?${kept.join("&")}` : "";
  return { src: `${base}${query}${fragment}`, width };
}

/** Écrit (ou retire) la largeur dans l'adresse. */
export function withImageWidth(src: string, width: number | null): string {
  const { src: clean } = readImageWidth(src);
  if (width === null) return clean;

  const rounded = Math.round(width);
  if (rounded < MIN_IMAGE_WIDTH || rounded > MAX_IMAGE_WIDTH) return clean;

  const [address, fragment] = splitFragment(clean);
  const separator = address.includes("?") ? "&" : "?";
  return `${address}${separator}w=${rounded}${fragment}`;
}
