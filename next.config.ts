import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { NextConfig } from "next";

/**
 * IDENTITÉ DU BINAIRE, scellée à la compilation.
 *
 * Ces valeurs sont lues ICI, et nulle part ailleurs : la machine qui exécute
 * l'application n'a pas forcément `git`, et n'a presque jamais le dépôt. Les
 * chercher à l'exécution reviendrait à ne rien afficher dès le premier
 * déploiement en conteneur.
 *
 * Chacune accepte d'être IMPOSÉE par l'environnement (`ARTEMIS_COMMIT`,
 * `ARTEMIS_COMMIT_DATE`) : c'est ce qui sauve les compilations faites depuis une
 * archive, ou dans un conteneur où le `.git` n'a pas été copié. La plupart des
 * forges fournissent déjà ces deux informations en variables.
 *
 * Aucune ne fait échouer le build : une application qui refuse de se compiler
 * parce qu'elle ignore son propre numéro de version serait un remède pire que
 * le mal. À défaut, elle en dit moins (cf. `describeBuild`).
 */

/** Lecture d'une commande Git, silencieuse en cas d'échec. */
function git(...args: string[]): string {
  try {
    return execFileSync("git", args, {
      encoding: "utf8",
      // `stdio` muet en erreur : hors dépôt, `git` écrit sur la sortie d'erreur
      // et polluerait chaque compilation d'un message sans conséquence.
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
  } catch {
    return "";
  }
}

/**
 * Version déclarée dans `package.json`.
 *
 * Lue à la main plutôt qu'importée : ce fichier est chargé tantôt comme module
 * ES, tantôt non, et `import ... with { type: "json" }` ne survit pas aux deux.
 */
function packageVersion(): string {
  try {
    const raw = readFileSync(path.join(process.cwd(), "package.json"), "utf8");
    const parsed: unknown = JSON.parse(raw);
    const version =
      typeof parsed === "object" && parsed !== null
        ? (parsed as { version?: unknown }).version
        : undefined;
    return typeof version === "string" ? version : "";
  } catch {
    return "";
  }
}

// `%cI` : date du COMMIT (et non celle de l'auteur, qui survit aux rebases et
// daterait le binaire d'avant le code qu'il contient), au format ISO 8601.
const commit = process.env.ARTEMIS_COMMIT?.trim() || git("rev-parse", "HEAD");
const commitDate =
  process.env.ARTEMIS_COMMIT_DATE?.trim() || git("log", "-1", "--format=%cI");

/**
 * POLITIQUE DE SÉCURITÉ DU CONTENU, en deux temps.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ON IMPOSE : CE QUI NE PEUT RIEN CASSER
 *
 * Ces quatre directives n'autorisent rien qui existait : l'application ne
 * s'encadre pas elle-même, ne charge aucun greffon, n'écrit pas de `<base>` et
 * ne poste que chez elle. Les refuser ne retire donc aucune fonction, et ferme
 * autant de portes - `object-src` en particulier, qu'aucun autre en-tête ne
 * couvre.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ON OBSERVE : LE RESTE
 *
 * `script-src` est le seul qui compte vraiment contre une XSS, et c'est celui
 * qu'on ne peut pas imposer tel quel : Next émet des scripts en ligne (le flux
 * RSC), et le sélecteur de thème aussi, pour poser la classe avant le premier
 * rendu. Il faudrait un jeton à usage unique par requête, posé par le
 * middleware - un vrai chantier, pas une ligne de configuration.
 *
 * En attendant, la politique complète est envoyée en OBSERVATION : le navigateur
 * signale ce qu'elle bloquerait sans rien bloquer. Sans collecteur configuré,
 * ces rapports vont dans la console du navigateur : c'est peu, mais c'est déjà
 * de quoi mesurer.
 *
 * CE QUE LA MESURE DIT DÉJÀ. En développement, la politique complète produit des
 * centaines de signalements, dont un `unsafe-eval` : c'est Turbopack qui évalue
 * du texte pour le rechargement à chaud. Sur un BUILD DE PRODUCTION servi par
 * `next start`, la même page n'en produit AUCUN - `unsafe-eval` compris. La
 * politique est donc imposable telle quelle en production ; ce qui manque n'est
 * pas la compatibilité, c'est la valeur : tant que `script-src` porte
 * `unsafe-inline`, il ne protège d'à peu près rien.
 *
 * Réserve honnête : cette mesure porte sur `/login`, la seule page atteignable
 * sans session sur le serveur de production d'essai. Avant d'imposer, parcourir
 * les pages authentifiées de la même façon.
 *
 * `img-src` mérite l'attention : les images d'une page de wiki sont chargées
 * depuis l'adresse qu'a écrite son auteur. Chacune signale à un tiers l'adresse
 * IP et l'heure de lecture de chaque lecteur. Le jour où les images seront
 * relayées par l'application, `img-src 'self' data:` deviendra tenable.
 */
const CSP_IMPOSEE = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const CSP_OBSERVEE = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  // `unsafe-inline` assumé tant qu'il n'y a pas de jeton par requête ; c'est
  // précisément ce que cette mise en observation sert à préparer.
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // `upgrade-insecure-requests` est volontairement absent : une politique en
  // observation l'ignore - le navigateur le dit à chaque page - et l'imposer
  // sur `http://localhost` casserait le développement.
].join("; ");

/**
 * En-têtes de sécurité (correctif L1) appliqués à toutes les routes.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP_IMPOSEE },
  { key: "Content-Security-Policy-Report-Only", value: CSP_OBSERVEE },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Une fonction non listée reste autorisée pour l'origine : les trois
    // premières ne suffisaient donc pas. On refuse tout ce dont l'application
    // n'a aucun usage.
    value: [
      "camera=()", "microphone=()", "geolocation=()", "payment=()", "usb=()",
      "serial=()", "bluetooth=()", "midi=()", "display-capture=()",
      "xr-spatial-tracking=()", "idle-detection=()", "local-fonts=()",
    ].join(", "),
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Remplacées TEXTUELLEMENT dans le bundle (cf. `src/lib/build-info.ts` et
  // `src/lib/instance.ts`). L'identité de l'instance doit atteindre le
  // NAVIGATEUR - elle teinte l'interface, pas seulement l'icône engendrée côté
  // serveur -, ce qu'une variable lue au runtime ne permettrait pas.
  env: {
    ARTEMIS_VERSION: packageVersion(),
    ARTEMIS_COMMIT: commit,
    ARTEMIS_COMMIT_DATE: commitDate,
    ARTEMIS_INSTANCE_LABEL: process.env.ARTEMIS_INSTANCE_LABEL?.trim() ?? "",
    ARTEMIS_INSTANCE_COLOR: process.env.ARTEMIS_INSTANCE_COLOR?.trim() ?? "",
  },
  /**
   * `/favicon.ico` n'existe plus comme fichier : l'icône dépend de l'instance et
   * ne peut donc pas être livrée dans le dépôt. Deux icônes déclarées auraient
   * laissé le navigateur choisir - et il choisit selon des règles qui lui
   * appartiennent. Une seule est annoncée (cf. `generateMetadata`), et cette
   * réécriture répond quand même aux clients qui demandent `/favicon.ico` sans
   * lire le HTML : lecteurs de flux, aperçus de lien, vieux navigateurs.
   *
   * Le type MIME annoncé sera `image/png` malgré l'extension : les navigateurs
   * se fient à l'en-tête, jamais au nom du fichier.
   */
  async rewrites() {
    return [{ source: "/favicon.ico", destination: "/icons/32" }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
