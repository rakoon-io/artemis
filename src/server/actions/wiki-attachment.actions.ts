"use server";

import type { z } from "zod";
import { assertProjectAccess } from "@/server/access";
import { confirmWikiAttachmentSchema } from "@/lib/validators";
import { isDangerousContentType } from "@/lib/attachments";
import { getWikiPage } from "@/server/services/wiki.service";
import {
  createWikiAttachment,
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
 * Enregistre les métadonnées après un dépôt DIRECT sur le stockage S3.
 *
 * Les contrôles sont rejoués ici et non délégués à la préparation : entre les
 * deux appels, rien ne garantit que le second vienne du même client.
 */
export async function confirmWikiAttachmentAction(
  input: z.input<typeof confirmWikiAttachmentSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = confirmWikiAttachmentSchema.parse(input);
    const page = await getWikiPage(data.pageId);
    if (!page) return { ok: false, error: "Page introuvable." };
    await assertProjectAccess(user, page.projectId);
    if (isDangerousContentType(data.contentType)) {
      return { ok: false, error: "Type de fichier refusé." };
    }
    // La clé doit rester dans l'espace de CETTE page : une clé reçue du client
    // pourrait sinon désigner l'objet d'un autre projet.
    if (!data.storageKey.startsWith(`wiki/${page.id}/`)) {
      return { ok: false, error: "Clé invalide." };
    }
    const created = await createWikiAttachment({
      pageId: page.id,
      filename: data.filename,
      contentType: data.contentType,
      size: data.size,
      storageKey: data.storageKey,
      uploadedById: user.id,
    });
    return { ok: true, data: { id: created.id } };
  });
}

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
