import crypto from "node:crypto";

/**
 * Jetons de premiere connexion / reinitialisation de mot de passe. Le jeton brut
 * (256 bits d'aleatoire) voyage dans le lien ; seul son hash SHA-256 est stocke
 * en base. Duree de vie limitee, usage unique.
 */

/**
 * Duree de validite d'un lien de premiere connexion (7 jours).
 *
 * Une INVITATION doit survivre a un week-end et a des vacances : l'administrateur
 * l'emet, le destinataire la trouve quand il revient.
 */
export const SETUP_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Duree de validite d'un lien de REINITIALISATION (1 heure).
 *
 * Le meme jeton servait les deux usages, donc sept jours pour les deux. Or on
 * demande une reinitialisation quand on est devant son clavier : la fenetre
 * utile se compte en minutes. Sept jours laissaient une prise de controle
 * valable une semaine dans une boite mail, un historique de navigation ou un
 * journal de proxy - alors meme que le lien avait deja servi son propos.
 */
export const RESET_TOKEN_TTL_MS = 60 * 60 * 1000;

/** Genere un jeton brut sur d'URL (base64url). */
export function generateSetupToken(): string {
  return crypto.randomBytes(32).toString("base64url");
}

/** Hash SHA-256 (hex) du jeton, stocke en base (jamais le jeton brut). */
export function hashSetupToken(raw: string): string {
  return crypto.createHash("sha256").update(raw).digest("hex");
}
