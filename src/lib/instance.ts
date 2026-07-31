/**
 * IDENTITÉ D'UNE INSTANCE - de quel déploiement s'agit-il.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LE PROBLÈME QUE ÇA RÈGLE
 *
 * Le même produit tourne à plusieurs adresses : production, recette, poste local,
 * une instance par client. Chaque origine est déjà une installation SÉPARÉE pour
 * le navigateur - ce n'est pas là que ça coince. Ça coince à l'œil : trois icônes
 * identiques dans le dock, trois fenêtres identiques, et aucune barre d'adresse
 * pour trancher, puisque le mode autonome la retire.
 *
 * Deux réglages suffisent alors, et ils vivent dans l'environnement, là où vit
 * déjà tout ce qui distingue un déploiement d'un autre :
 *
 *   ARTEMIS_INSTANCE_LABEL   « Recette », « Local », « Client A »…
 *   ARTEMIS_INSTANCE_COLOR   « #c2410c » - teinte l'icône ET l'interface.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA PRODUCTION NE SE DÉCLARE PAS
 *
 * Sans étiquette, l'application est « Artemis », dans sa couleur de marque : la
 * production reste la référence, et n'a pas à porter un badge disant qu'elle est
 * la production. Ce sont les autres qui se signalent - c'est l'inverse qui
 * conduirait à oublier d'étiqueter le seul endroit où l'oubli coûte cher.
 */

/** Couleur de marque, quand aucune n'est imposée (cf. `--primary` du thème). */
export const BRAND_COLOR = "#5f4ec2";

/**
 * Étiquette VOLONTAIREMENT courte : elle est peinte sur une icône de 192 pixels
 * et se glisse dans une barre déjà pleine. Au-delà, on ne la lirait plus.
 */
export const MAX_LABEL = 12;

export interface Instance {
  /** Nom du déploiement, ou `null` pour l'instance de référence. */
  label: string | null;
  /** Couleur d'identification, toujours définie (marque par défaut). */
  color: string;
  /** Nom affiché : « Artemis », ou « Artemis · Recette ». */
  name: string;
}

/** Une couleur hexadécimale à 3 ou 6 chiffres, seule forme acceptée. */
const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Construit l'identité d'une instance à partir de valeurs brutes.
 *
 * Fonction PURE, `process.env` restant dehors : c'est la seule façon d'éprouver
 * les cas tordus - couleur invraisemblable, étiquette de deux cents caractères -
 * sans monter un environnement pour chacun.
 *
 * Une couleur qui n'est pas une couleur est IGNORÉE, jamais transmise telle
 * quelle. Injectée dans une feuille de style, une valeur fantaisiste ne teinte
 * rien et casse silencieusement le thème ; dans le manifeste, elle en invalide
 * la lecture entière. Mieux vaut la couleur de marque qu'un manifeste refusé.
 */
export function readInstance(raw: {
  label?: string | null;
  color?: string | null;
}): Instance {
  const label = (raw.label ?? "").trim().slice(0, MAX_LABEL) || null;
  const color = (raw.color ?? "").trim();
  return {
    label,
    color: HEX.test(color) ? color.toLowerCase() : BRAND_COLOR,
    // Le point médian sépare sans hiérarchiser : « Artemis » reste le produit,
    // « Recette » dit lequel. Un tiret aurait suggéré un sous-produit.
    name: label ? `Artemis · ${label}` : "Artemis",
  };
}

/**
 * L'instance courante, lue dans l'environnement.
 *
 * Les deux variables sont scellées au build (cf. `next.config.ts`) : l'icône est
 * engendrée côté serveur, mais la teinte doit aussi atteindre le navigateur, et
 * une variable lue au runtime n'y parviendrait pas.
 */
export const instance: Instance = readInstance({
  label: process.env.ARTEMIS_INSTANCE_LABEL,
  color: process.env.ARTEMIS_INSTANCE_COLOR,
});
