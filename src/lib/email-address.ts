import { z } from "zod";

/**
 * FORME CANONIQUE D'UNE ADRESSE E-MAIL - l'identité d'un compte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE L'ABSENCE DE CANONISATION PERMETTAIT
 *
 * L'adresse était stockée telle que saisie, et la contrainte d'unicité porte sur
 * les OCTETS. Mesuré sur l'application : un POST non authentifié sur
 * `/api/register` portant `Admin@Rakoon.io` répondait 201 alors que
 * `admin@rakoon.io` existait déjà - deux comptes, une seule boîte aux lettres.
 * Trois conséquences, dans l'ordre de gravité :
 *
 * - HOMOGRAPHE. Les listes de membres affichent le nom, et l'adresse dessous.
 *   Un second compte portant le même nom et la même adresse à la casse près y
 *   est indiscernable du premier ; qui l'ajoute à un projet croit inviter son
 *   administrateur.
 * - CONNEXION IMPOSSIBLE. La recherche se fait par égalité stricte : le
 *   titulaire qui saisit son adresse avec une capitale - ce que font les
 *   claviers de téléphone sur le premier caractère - reçoit « identifiants
 *   invalides », sans moyen de comprendre pourquoi.
 * - RÉINITIALISATION MUETTE. La demande de nouveau mot de passe répond
 *   volontairement la même chose que le compte existe ou non ; avec une
 *   capitale, elle ne trouve rien et ne dit rien. L'utilisateur attend un
 *   courriel qui ne viendra jamais.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI TOUT ABAISSER, ET PAS SEULEMENT LE DOMAINE
 *
 * La RFC 5321 ne rend insensible à la casse que la partie DOMAINE ; la partie
 * locale appartient au serveur destinataire, qui a le droit de distinguer
 * `Jean@` de `jean@`. Aucun service courant n'use de ce droit.
 *
 * Le choix se tranche par la nature de l'erreur qu'il reste possible :
 * - abaisser toute l'adresse peut refuser une inscription à deux personnes
 *   réellement distinctes sur un serveur qui les distinguerait. C'est une gêne,
 *   visible, et qu'un administrateur règle ;
 * - ne pas l'abaisser laisse deux comptes exister pour une même personne, ce
 *   qui est invisible et se retourne en usurpation.
 *
 * On préfère la gêne visible.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QU'ON NE FAIT PAS
 *
 * Ni suppression des points, ni troncature après `+` : ces règles-là sont
 * propres à certains fournisseurs, et les appliquer à tous ferait de deux
 * adresses légitimement distinctes un seul compte - la faute inverse, et pire.
 * Le sous-adressage reste donc un compte à part entière, ce qu'il est.
 */

/**
 * `toLowerCase` et non `toLocaleLowerCase` : la seconde dépend de la locale du
 * PROCESSUS. En turc, `"I".toLocaleLowerCase("tr")` donne `"ı"` - un autre
 * caractère. L'identité d'un compte se mettrait alors à dépendre de la variable
 * d'environnement du serveur qui l'écrit, et une adresse enregistrée ici
 * deviendrait introuvable ailleurs.
 */
export function canonicalEmail(brut: string): string {
  return brut.trim().toLowerCase();
}

/**
 * Le champ e-mail de tous les schémas, canonisé AVANT d'être validé.
 *
 * Le placer dans le schéma - et non dans chaque service - est ce qui empêche la
 * divergence : une frontière franchie est une adresse canonique, sans que
 * l'appelant ait à y penser. `trim`/`toLowerCase` s'appliquent avant `email`, et
 * la valeur reste une `ZodString`, donc toujours chaînable (`.optional()`, etc.).
 */
export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("E-mail invalide");
