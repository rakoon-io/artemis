/**
 * IDENTITÉ DU BINAIRE : quelle version, et quel code exactement.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LA DATE DU COMMIT, ET NON CELLE DU BUILD
 *
 * Un numéro de version seul ne suffit pas : entre deux livraisons, `0.1.0`
 * désigne des dizaines d'états différents du code. « Vous avez 0.1.0 » ne répond
 * pas à « avez-vous le correctif ».
 *
 * La date du BUILD, elle, ne dit rien du code : recompiler le même commit trois
 * fois donne trois horodatages pour un seul logiciel, et deux instances
 * identiques paraissent différentes. La date du COMMIT est une propriété du
 * code lui-même - deux binaires qui l'affichent portent le même code, sans
 * discussion possible.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FIGÉ AU BUILD, ET C'EST VOULU
 *
 * Les trois valeurs sont scellées dans le bundle à la compilation (voir
 * `next.config.ts`) : `git` n'existe pas forcément sur la machine qui exécute
 * l'application, et le dépôt encore moins. Les lire à l'exécution serait les
 * perdre au premier déploiement en conteneur.
 *
 * Corollaire à connaître : en développement, elles datent du DÉMARRAGE du
 * serveur. Commiter ne les met pas à jour ; il faut relancer.
 */

/** Ce que l'on sait du code en cours d'exécution. */
export interface BuildInfo {
  /** Version déclarée dans `package.json` (« 0.1.0 »). */
  version: string;
  /** Empreinte complète du commit, ou `null` hors dépôt Git. */
  commit: string | null;
  /** Instant du commit, ISO 8601, ou `null`. */
  commitDate: string | null;
}

/**
 * Les valeurs scellées au build.
 *
 * `process.env.X` s'écrit ici EN TOUTES LETTRES : le bundler remplace ce texte
 * exact par la valeur. Une déstructuration ou une clé calculée ne serait pas
 * reconnue, et l'expression vaudrait `undefined` en production.
 */
export const buildInfo: BuildInfo = {
  version: process.env.ARTEMIS_VERSION || "",
  commit: process.env.ARTEMIS_COMMIT || null,
  commitDate: process.env.ARTEMIS_COMMIT_DATE || null,
};

/** Ce qui s'affiche, une fois l'inconnu écarté. */
export interface BuildLabel {
  /** « v0.1.0+46cc1f5 », ou `null` s'il n'y a rien à dire. */
  release: string | null;
  /** Instant du commit en ISO, propre à alimenter `<time dateTime>`. */
  dateTime: string | null;
}

/** Longueur d'empreinte affichée - celle que Git lui-même abrège par défaut. */
const SHORT_SHA = 7;

/**
 * Met en forme l'identité du build.
 *
 * `+empreinte` suit la syntaxe des métadonnées de build de semver : c'est
 * l'endroit prévu pour ce qui identifie une compilation sans participer à
 * l'ordre des versions. Un lecteur habitué la reconnaît, et un lecteur non
 * averti lit quand même « 0.1.0 » en premier.
 *
 * Tout est facultatif, et rien n'est inventé : sans dépôt Git on affiche la
 * seule version, sans `package.json` lisible la seule empreinte, et sans ni
 * l'une ni l'autre, rien du tout - plutôt qu'un « v0.0.0 » qui aurait l'air
 * d'une vraie réponse.
 */
export function describeBuild(
  info: BuildInfo,
  shaLength: number = SHORT_SHA,
): BuildLabel {
  const version = info.version.trim();
  const commit = info.commit?.trim() ?? "";
  const short = commit.slice(0, Math.max(0, shaLength));

  const release = version
    ? short
      ? `v${version}+${short}`
      : `v${version}`
    : short || null;

  return { release, dateTime: isoInstant(info.commitDate) };
}

/**
 * Ne laisse passer qu'une date réellement analysable.
 *
 * `new Date("n'importe quoi")` rend un objet valide dont le temps est `NaN` :
 * sans ce garde-fou, `<time dateTime>` porterait une valeur que rien ne sait
 * lire, et l'affichage se réduirait à un tiret sans qu'on sache pourquoi.
 */
function isoInstant(value: string | null): string | null {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}
