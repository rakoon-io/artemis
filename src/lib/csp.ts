/**
 * POLITIQUE DE SÉCURITÉ DU CONTENU - la version qui protège vraiment.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI MANQUAIT
 *
 * `script-src` est la seule directive qui compte contre une injection de script,
 * et c'était celle qu'on ne pouvait pas imposer : Next émet une dizaine de
 * scripts EN LIGNE par page - le flux RSC, et le sélecteur de thème qui pose la
 * classe avant le premier rendu. Les autoriser demandait `unsafe-inline`, ce qui
 * autorise du même coup tout script qu'un attaquant parviendrait à écrire dans
 * la page. La directive était présente et ne protégeait de rien.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE JETON PAR REQUÊTE
 *
 * Un nonce lève l'objection : chaque réponse tire une valeur aléatoire, les
 * scripts que NOUS émettons la portent, et le navigateur refuse tous les autres.
 * Un script injecté ne peut pas la deviner - elle change à chaque requête et ne
 * transite jamais ailleurs que dans la réponse elle-même.
 *
 * Deux conséquences qui ont été mesurées avant d'écrire ceci :
 *
 * - le nonce force le RENDU DYNAMIQUE des pages concernées. Coût réel ici :
 *   AUCUN. Le build ne produit pas une seule route statique - toutes sont déjà
 *   marquées `ƒ`, l'application lisant la base à chaque affichage ;
 * - la présence d'un nonce fait IGNORER `unsafe-inline` par les navigateurs qui
 *   le comprennent. Le garder n'aurait donc pas servi de repli : il aurait servi
 *   de repli aux SEULS navigateurs trop anciens pour connaître les nonces. On ne
 *   le garde pas.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI RESTE LARGE, ET POURQUOI
 *
 * `style-src` garde `unsafe-inline` : les bibliothèques d'interface (Radix pour
 * les surfaces flottantes, dnd-kit pendant un glisser) posent des styles en
 * ligne, et les retirer demanderait de réécrire leur positionnement. Le risque
 * résiduel d'une injection de style est réel mais d'un autre ordre - exfiltrer
 * par sélecteur d'attribut, non exécuter du code.
 *
 * `img-src` accepte `https:` : les images d'une page de wiki sont chargées
 * depuis l'adresse qu'a écrite son auteur. Chacune signale à un tiers l'adresse
 * IP et l'heure de lecture de chaque lecteur. Le jour où les images seront
 * relayées par l'application, `img-src 'self' data:` deviendra tenable - c'est
 * pour préparer ce jour que la politique OBSERVÉE, elle, l'impose déjà.
 *
 * `'self'` reste dans `script-src` : les fragments de Next sont servis depuis
 * notre origine. Une pièce jointe déposée par un utilisateur ne peut pas s'y
 * substituer - `X-Content-Type-Options: nosniff` interdit d'exécuter comme
 * script ce qui n'est pas annoncé comme tel, et la route de téléchargement
 * n'annonce jamais un type exécutable (cf. `safeServing`).
 */

/** Directives communes aux deux politiques - ce qui ne dépend pas du jeton. */
const SOCLE = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "font-src 'self' data:",
  "connect-src 'self'",
];

/**
 * La politique IMPOSÉE, celle que le navigateur applique.
 *
 * @param nonce jeton de la requête en cours, en base64.
 */
export function politiqueImposee(nonce: string): string {
  return [
    ...SOCLE,
    `script-src 'self' 'nonce-${nonce}'`,
    // Voir l'en-tête : les surfaces flottantes et le glisser-déposer posent des
    // styles en ligne. Assumé, et surveillé par la politique observée.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
  ].join("; ");
}

/**
 * La politique OBSERVÉE, d'un cran plus stricte : le navigateur signale ce
 * qu'elle bloquerait, sans rien bloquer.
 *
 * C'est la même discipline qu'avant, remontée d'un niveau. Elle ne sert plus à
 * savoir si l'on peut se passer d'`unsafe-inline` dans `script-src` - c'est
 * fait - mais à mesurer ce qu'il en coûterait de fermer les deux portes qui
 * restent : les styles en ligne, et les images de tiers.
 *
 * Sans collecteur configuré, ces signalements vont dans la console du
 * navigateur. C'est peu, mais c'est de quoi mesurer avant de décider.
 */
export function politiqueObservee(nonce: string): string {
  return [
    ...SOCLE,
    `script-src 'self' 'nonce-${nonce}'`,
    `style-src 'self' 'nonce-${nonce}'`,
    "img-src 'self' data: blob:",
    // Volontairement absent : `upgrade-insecure-requests`, qu'une politique en
    // observation ignore - le navigateur le dit à chaque page - et qui casserait
    // le développement sur `http://localhost`.
  ].join("; ");
}

/**
 * Jeton aléatoire pour une requête.
 *
 * `crypto.getRandomValues` et non `Math.random` : tout l'édifice tient à ce que
 * le jeton soit IMPREVISIBLE. Le générateur de `Math.random` se reconstitue à
 * partir de quelques sorties observées, et un attaquant capable d'injecter un
 * script observe les siennes à chaque page qu'il charge.
 *
 * Seize octets, comme le recommande la spécification. La fonction vit ici, et
 * non dans le middleware, pour être vérifiable par un test.
 */
export function nouveauNonce(): string {
  const octets = new Uint8Array(16);
  crypto.getRandomValues(octets);
  return btoa(String.fromCharCode(...octets));
}
