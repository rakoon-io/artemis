/**
 * L'EMBLÈME EN SVG BRUT, prêt à être peint dans une image engendrée.
 *
 * Même dessin que `TrackerMark`, écrit ici en chaîne de caractères parce que le
 * moteur d'images du serveur consomme une URL de données, pas un composant
 * React. Il vit dans `src/lib` et non dans un fichier `.svg` : l'image du
 * conteneur ne copie ni `src/` ni les sources, seulement le bundle - un
 * `readFileSync` au démarrage y échouerait.
 *
 * Le motif est MONOCHROME BLANC : ce sont le fond et l'étiquette qui portent la
 * couleur de l'instance, jamais l'emblème lui-même, qui doit rester lisible sur
 * n'importe quelle teinte.
 */
const MARK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none">
<path d="M50.31 13.66 A26 26 0 1 1 86.34 49.69 A27 27 0 0 0 50.31 13.66 Z" fill="#ffffff"/>
<g transform="rotate(-45 50 50)" stroke="#ffffff" stroke-width="8.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
<path d="M38 20 Q62 50 38 80"/>
<path d="M38 20 L28 50 L38 80"/>
<path d="M24 50 H72"/>
<path d="M63 43 L76 50 L63 57"/>
<path d="M24 50 L33 44"/>
<path d="M24 50 L33 56"/>
</g>
</svg>`;

/**
 * URL de données de l'emblème.
 *
 * Encodée en base64 plutôt qu'échappée en pourcents : le SVG contient des
 * guillemets et des dièses, et un `#` non échappé coupe une URL de données au
 * milieu - la moitié du dessin disparaîtrait sans erreur.
 */
export const MARK_DATA_URI = `data:image/svg+xml;base64,${Buffer.from(MARK_SVG).toString("base64")}`;
