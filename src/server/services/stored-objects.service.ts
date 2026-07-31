import { prisma } from "@/lib/db";
import { deleteStored } from "@/lib/storage";

/**
 * EFFACER POUR DE BON - les octets, et pas seulement la ligne qui les désigne.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI SE PASSAIT
 *
 * `deleteStored` existait, exportée, et n'était appelée de nulle part. Toutes
 * les suppressions ne retiraient que la MÉTADONNÉE : la ligne disparaissait,
 * l'objet restait. Mesuré sur l'instance de développement au moment d'écrire
 * ceci : deux fichiers présents sur le disque dont plus aucune ligne ne parlait,
 * laissés par des suppressions faites depuis l'interface.
 *
 * Ce n'est pas qu'une question de place. Un document déposé par erreur - le
 * mauvais fichier, une pièce confidentielle - se supprime, l'application dit
 * que c'est fait, et les octets restent lisibles pour qui accède au seau ou au
 * volume. À une demande d'effacement, on répondait donc à côté.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA CASCADE EST LE VRAI PIÈGE
 *
 * Supprimer une ligne de pièce jointe est visible ; supprimer un TICKET l'est
 * moins, et emporte ses pièces jointes par cascade - côté base, sans que
 * l'application voie jamais passer les clés. Supprimer une PAGE DE WIKI emporte
 * en plus tout son sous-arbre, donc les pièces jointes de pages qu'on n'a pas
 * nommées. Après coup, plus rien ne relie ces objets à quoi que ce soit : on ne
 * peut même plus savoir qu'ils sont orphelins.
 *
 * D'où l'ordre imposé partout : RELEVER les clés, SUPPRIMER en base, puis
 * effacer les objets.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LA BASE D'ABORD
 *
 * Les deux gestes ne peuvent pas être atomiques - une transaction SQL n'englobe
 * pas un seau S3. Il reste donc à choisir quelle incohérence on préfère quand
 * le second échoue :
 *
 * - base d'abord : un objet survit sans ligne. Invisible, récupérable, sans
 *   conséquence fonctionnelle ;
 * - objets d'abord : une ligne survit sans objet. L'interface affiche une pièce
 *   jointe qui ne se télécharge pas, et l'utilisateur ne peut rien y faire.
 *
 * On prend la première.
 */

/**
 * Efface des objets de stockage, sans jamais faire échouer l'appelant.
 *
 * La suppression métier a DÉJÀ réussi quand on arrive ici : relancer l'erreur
 * afficherait « échec » sur une opération accomplie, et inviterait à réessayer
 * une suppression qui n'a plus rien à supprimer. On journalise, ce qui laisse
 * de quoi rattraper à la main, et on rend la main.
 *
 * `effacer` est injectable pour que cette promesse-là - « ne lève jamais » - se
 * VÉRIFIE au lieu de s'affirmer. Elle est facile à rompre par mégarde : passer
 * de `allSettled` à `all` suffirait, et le jour où le seau répond mal, chaque
 * suppression de ticket échouerait alors qu'elle a eu lieu.
 */
export async function forgetObjects(
  keys: readonly string[],
  effacer: (key: string) => Promise<void> = deleteStored,
): Promise<void> {
  if (keys.length === 0) return;
  const issues = await Promise.allSettled(keys.map((key) => effacer(key)));
  issues.forEach((issue, i) => {
    if (issue.status === "rejected") {
      // La clé est journalisée : sans elle, l'objet resté en place est
      // introuvable, la ligne qui le désignait n'existant plus.
      console.error(
        `[stockage] objet non effacé, à retirer à la main : ${keys[i]}`,
        issue.reason,
      );
    }
  });
}

/**
 * Clés des pièces jointes d'une page de wiki ET DE TOUT SON SOUS-ARBRE.
 *
 * `WikiPage.parentId` est en `onDelete: Cascade` : supprimer une page supprime
 * ses enfants, leurs enfants, sans limite de profondeur. Une requête sur la
 * seule page nommée manquerait donc toutes les pièces jointes des pages
 * emportées avec elle.
 *
 * Récursive côté SQL plutôt qu'en boucle applicative : un seul aller-retour, et
 * la profondeur n'est pas un paramètre qu'on puisse se tromper à choisir.
 */
export async function wikiSubtreeKeys(pageId: string): Promise<string[]> {
  const rows = await prisma.$queryRaw<Array<{ storageKey: string }>>`
    WITH RECURSIVE sous_arbre AS (
      SELECT id FROM "WikiPage" WHERE id = ${pageId}
      UNION ALL
      SELECT enfant.id
        FROM "WikiPage" enfant
        JOIN sous_arbre parent ON enfant."parentId" = parent.id
    )
    SELECT piece."storageKey"
      FROM "WikiAttachment" piece
      JOIN sous_arbre ON piece."pageId" = sous_arbre.id
  `;
  return rows.map((r) => r.storageKey);
}
