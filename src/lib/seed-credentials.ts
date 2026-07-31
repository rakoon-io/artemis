/**
 * IDENTIFIANTS DES COMPTES D'AMORÇAGE - lus dans l'environnement, jamais écrits ici.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI CE FICHIER EXISTE
 *
 * Les mots de passe du seed étaient inscrits dans le code, répétés dans le
 * README, dans la carte de démonstration et dans la documentation de
 * déploiement. Ce dépôt étant public, ils l'étaient aussi - et la production
 * tournait avec. Un mot de passe versionné est un mot de passe publié : la
 * seule correction durable est qu'il n'y ait rien à publier.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TROIS SITUATIONS, TROIS COMPORTEMENTS
 *
 * - Variable FOURNIE : on l'utilise. C'est le cas d'une instance de
 *   démonstration, où les identifiants sont publics À DESSEIN et affichés sur
 *   l'écran de connexion.
 * - Variable ABSENTE, hors production : on engendre un mot de passe aléatoire et
 *   on l'IMPRIME une fois. Le développeur l'a sous les yeux, et rien ne subsiste
 *   dans le dépôt.
 * - Variable ABSENTE, en production : on refuse. Amorcer une base de production
 *   avec un mot de passe engendré que personne n'a noté ne rend service à
 *   personne ; et lui en donner un connu serait recommencer la faute.
 */

import crypto from "node:crypto";

/** Mot de passe lisible mais imprévisible, pour un amorçage local. */
export function randomPassword(): string {
  // base64url : ni ambiguïté visuelle, ni caractère à échapper dans un terminal.
  return crypto.randomBytes(12).toString("base64url");
}

export interface SeedAccount {
  password: string;
  /** Vrai si le mot de passe vient d'être engendré, donc à montrer une fois. */
  generated: boolean;
}

/**
 * Résout le mot de passe d'un compte d'amorçage.
 *
 * @param variable  nom de la variable d'environnement attendue, cité dans les erreurs.
 * @param fourni    sa valeur, telle que lue par l'appelant.
 * @param production vrai si l'on amorce une base de production.
 */
export function resolveSeedPassword(
  variable: string,
  fourni: string | undefined,
  production: boolean,
): SeedAccount {
  const valeur = fourni?.trim();
  if (valeur) return { password: valeur, generated: false };
  if (production) {
    throw new Error(
      `${variable} est requis pour amorcer une base de production. ` +
        `Fournissez un mot de passe (openssl rand -base64 24), ou n'amorcez pas.`,
    );
  }
  return { password: randomPassword(), generated: true };
}
