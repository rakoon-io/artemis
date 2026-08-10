"use server";

import { assertProjectAccess } from "@/server/access";
import {
  deleteWikiAttachment,
  getWikiAttachmentWithProject,
} from "@/server/services/wiki-attachment.service";
import { deleteObject } from "@/lib/storage";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions des pièces jointes de page de wiki.
 *
 * Déposer et retirer un document relève de l'écriture d'une page : ouvert à tout
 * membre du projet, comme le contenu lui-même.
 */

/**
 * Retire une pièce jointe : la ligne ET l'objet stocké.
 *
 * Le CONTENU DE LA PAGE n'est pas touché. Une image supprimée alors qu'elle est
 * encore citée laisse une adresse morte, visible - plutôt que de réécrire le
 * texte de quelqu'un d'autre sur une supposition.
 */
export async function deleteWikiAttachmentAction(
  id: string,
): Promise<ActionResult> {
  return withUser(async (user) => {
    const file = await getWikiAttachmentWithProject(id);
    if (!file) return { ok: false, error: "Pièce jointe introuvable." };
    await assertProjectAccess(user, file.page.projectId);
    await deleteWikiAttachment(id);
    // L'objet en dernier : si son effacement échoue, la page n'affiche déjà plus
    // la pièce jointe, et il ne reste qu'un fichier orphelin - moins grave
    // qu'une ligne pointant sur un objet disparu.
    await deleteObject(file.storageKey).catch(() => {});
    return { ok: true };
  });
}
