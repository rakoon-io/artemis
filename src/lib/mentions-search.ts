/**
 * RETROUVER SES CITATIONS, sans table de citations.
 *
 * Une mention de personne est écrite `[@Nom](mailto:adresse)` dans le Markdown
 * (cf. `userMentionMarkdown`) : elle se suffit à elle-même, au prix qu'elle
 * n'est reliée à rien. Chercher « qui m'a cité » revient donc à chercher cette
 * adresse dans les textes - la seule trace qui existe.
 *
 * Le module reste PUR : il fabrique l'aiguille et découpe l'extrait, la base de
 * données faisant la recherche. C'est aussi ce qui le rend testable.
 */

/**
 * Ce qu'il faut chercher dans un texte pour y trouver la citation d'une
 * personne. La parenthèse fermante est incluse À DESSEIN : sans elle,
 * `mailto:jean@x.fr` trouverait aussi `jean@x.fr.invalid`, et une adresse qui
 * en préfixe une autre ramènerait les citations d'un homonyme.
 */
export function mentionNeedle(email: string): string {
  return `(mailto:${email.trim()})`;
}

/** Longueur par défaut de l'extrait rendu autour d'une citation. */
export const EXCERPT_RADIUS = 90;

/**
 * Extrait lisible autour de la première occurrence de `needle`.
 *
 * On rend le texte ENVIRONNANT, pas la citation elle-même : savoir qu'on est
 * cité n'apprend rien, ce qui compte est ce qui se disait autour. Le balisage
 * Markdown est retiré pour que l'extrait se lise d'une traite.
 */
export function excerptAround(
  text: string,
  needle: string,
  radius: number = EXCERPT_RADIUS,
): string {
  const at = text.indexOf(needle);
  // Citation introuvable (texte modifié depuis la requête) : on rend le début,
  // ce qui vaut mieux qu'un extrait vide.
  const center = at === -1 ? 0 : at;
  const from = Math.max(0, center - radius);
  const to = Math.min(text.length, center + needle.length + radius);

  const slice = text.slice(from, to);
  const cleaned = redactAddresses(stripMarkdown(slice));
  if (!cleaned) return "";

  return `${from > 0 ? "…" : ""}${cleaned}${to < text.length ? "…" : ""}`;
}

/**
 * Filet de sécurité : aucune adresse ne sort d'ici, jamais.
 *
 * `stripMarkdown` reconnaît des liens ENTIERS. Or l'extrait est une TRANCHE :
 * quand sa borne tombe au milieu d'une citation VOISINE, il ne reste qu'un
 * fragment - `…martin@client.com) peux-tu` - où plus aucun motif de lien n'est
 * reconnaissable. L'adresse d'un tiers s'affichait alors en clair sur la page
 * d'accueil de quelqu'un d'autre.
 *
 * Débaliser d'abord et trancher ensuite coûterait de débaliser des pages
 * entières à chaque affichage. On coupe donc toujours, et l'on retire ensuite ce
 * qu'une coupure a pu mettre à nu.
 */
function redactAddresses(text: string): string {
  return text
    .replace(/\(?\s*mailto:[^\s)]*\)?/gi, "")
    // Une adresse nue, qu'aucune syntaxe de lien n'entoure plus.
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+\)?/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Débalise sommairement du Markdown pour un APERÇU d'une ligne. On ne cherche
 * pas à rendre le document : les liens deviennent leur libellé, les marqueurs
 * de mise en forme disparaissent, et tout blanc se réduit à une espace.
 */
export function stripMarkdown(input: string): string {
  return (
    input
      // Images d'abord : `![texte](url)` ne doit pas laisser son « ! ».
      .replace(/!\[((?:\\.|[^\]\\])*)\]\([^)]*\)/g, "$1")
      // Liens : on garde le libellé, qui porte le sens (« @Nom » pour une citation).
      //
      // Le libellé accepte des caractères ÉCHAPPÉS, et il le faut : une citation
      // dont le nom porte des crochets s'écrit `[@Ana \[DSI\]](mailto:…)`, car
      // `escapeLabel` neutralise `\`, `[` et `]`. Une expression qui refuse tout
      // `]` dans le libellé ne reconnaissait pas ces citations : le lien
      // ressortait brut dans l'aperçu, ADRESSE COMPRISE - soit exactement ce que
      // cette fonction existe pour éviter.
      .replace(/\[((?:\\.|[^\]\\])*)\]\([^)]*\)/g, "$1")
      // Les échappements ont fait leur office, ils n'ont plus à se lire.
      .replace(/\\([\\[\]])/g, "$1")
      // Titres, citations et puces en début de ligne.
      .replace(/^[ \t]*#{1,6}[ \t]+/gm, "")
      .replace(/^[ \t]*>[ \t]?/gm, "")
      .replace(/^[ \t]*[-*+][ \t]+/gm, "")
      // Emphases et code : les marqueurs, jamais le contenu.
      .replace(/[*_~`]+/g, "")
      .replace(/\s+/g, " ")
      .trim()
  );
}
