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
 * En-têtes de sécurité (correctif L1) appliqués à toutes les routes.
 * Pas de Content-Security-Policy ici : trop de risques de casser Next (à cadrer à part).
 */
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  // Remplacées TEXTUELLEMENT dans le bundle (cf. `src/lib/build-info.ts`).
  env: {
    ARTEMIS_VERSION: packageVersion(),
    ARTEMIS_COMMIT: commit,
    ARTEMIS_COMMIT_DATE: commitDate,
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
