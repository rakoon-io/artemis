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
  /**
   * Jeton court qui change dès que l'apparence change.
   *
   * Il voyage dans l'adresse des icônes. Sans lui, une icône réglée « pour un
   * an, immuable » ne serait JAMAIS reprise après modification - or elle est
   * désormais modifiable depuis l'administration. Le jeton fait de chaque
   * apparence une adresse distincte : le cache reste agressif, et pourtant
   * juste, parce qu'il ne ment plus sur ce qu'il conserve.
   */
  token: string;
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
  const brut = (raw.color ?? "").trim();
  const color = HEX.test(brut) ? brut.toLowerCase() : BRAND_COLOR;
  return {
    label,
    color,
    // Le point médian sépare sans hiérarchiser : « Artemis » reste le produit,
    // « Recette » dit lequel. Un tiret aurait suggéré un sous-produit.
    name: label ? `Artemis · ${label}` : "Artemis",
    token: appearanceToken(label, color),
  };
}

/**
 * Empreinte de l'apparence : deux réglages identiques donnent le même jeton,
 * deux réglages différents en donnent d'autres.
 *
 * Une somme de contrôle maison, et non une fonction de hachage cryptographique :
 * rien ici n'est secret ni ne doit résister à une attaque - on cherche seulement
 * une adresse courte et stable. `node:crypto` obligerait par ailleurs ce module,
 * partagé, à ne plus tourner que sur le serveur.
 */
function appearanceToken(label: string | null, color: string): string {
  const source = `${label ?? ""}|${color}`;
  let h = 2166136261;
  for (let i = 0; i < source.length; i++) {
    h ^= source.charCodeAt(i);
    // Facteur de FNV-1a, écrit en multiplications partielles : `h * 16777619`
    // dépasserait la précision des entiers de JavaScript et perdrait des bits.
    h = (h + (h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24)) >>> 0;
  }
  return h.toString(36);
}

/**
 * Ce que dit l'ENVIRONNEMENT - le point de départ, avant toute personnalisation.
 *
 * Il vaut dès le premier démarrage, avant qu'un administrateur ait pu se
 * connecter, et reste la valeur d'une instance qu'on ne touche jamais. La base
 * ne fait que le surcharger (cf. `resolveInstance`).
 */
export const envInstance: Instance = readInstance({
  label: process.env.ARTEMIS_INSTANCE_LABEL,
  color: process.env.ARTEMIS_INSTANCE_COLOR,
});

/**
 * Superpose les réglages enregistrés à ceux de l'environnement.
 *
 * CHAMP PAR CHAMP, et non en bloc : régler la seule couleur depuis
 * l'administration ne doit pas effacer l'étiquette venue de l'environnement.
 * `null` en base signifie « rien de choisi ici », pas « effacer » - c'est la
 * chaîne VIDE qui efface, et il faut donc les distinguer.
 */
export function resolveInstance(
  stored: { instanceLabel: string | null; instanceColor: string | null } | null,
): Instance {
  return readInstance({
    label: stored?.instanceLabel ?? process.env.ARTEMIS_INSTANCE_LABEL,
    color: stored?.instanceColor ?? process.env.ARTEMIS_INSTANCE_COLOR,
  });
}
