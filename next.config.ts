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
 * LE PLANCHER : la politique de ce qui n'a pas de jeton.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * OÙ VIT LA VRAIE POLITIQUE
 *
 * Elle vit dans `src/lib/csp.ts` et se pose dans le middleware, parce qu'elle
 * porte un jeton tiré à chaque requête - ce qu'un fichier de configuration, lu
 * une fois au démarrage, ne peut pas faire. C'est ce jeton qui permet enfin de
 * se passer d'`unsafe-inline` dans `script-src`, donc de protéger de quelque
 * chose.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI RESTE ICI, ET POURQUOI
 *
 * Le middleware ne voit pas tout : son filtre écarte `/api`, les fragments
 * statiques et les images. Ces réponses-là n'ont aucun script en ligne, donc
 * aucun besoin de jeton - mais elles ont besoin d'une politique. Ces quatre
 * directives sont celles qui ont un sens sans jeton, et elles n'autorisent rien
 * qui existait : l'application ne s'encadre pas elle-même, ne charge aucun
 * greffon, n'écrit pas de `<base>` et ne poste que chez elle.
 *
 * Les pages, elles, reçoivent la politique complète du middleware, qui remplace
 * celle-ci.
 */
const CSP_PLANCHER = [
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

/**
 * En-têtes de sécurité (correctif L1) appliqués à toutes les routes.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: CSP_PLANCHER },
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
