import crypto from "node:crypto";

/**
 * Jetons de premiere connexion / reinitialisation de mot de passe. Le jeton brut
 * (256 bits d'aleatoire) voyage dans le lien ; seul son hash SHA-256 est stocke
 * en base. Duree de vie limitee, usage unique.
 */

/** Duree de validite d'un lien de premiere connexion (7 jours). */
export const SETUP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Genere un jeton brut sur d'URL (base64url). */
export function generateSetupToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Hash SHA-256 (hex) du jeton, stocke en base (jamais le jeton brut). */
export function hashSetupToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
