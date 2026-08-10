"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isDangerousContentType } from "@/lib/attachments";
import { assert, canAttachToTicket, canRemoveAttachment } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { getTicketOwnership } from "@/server/services/ticket.service";
import {
  createAttachment,
  deleteAttachment,
  getAttachment,
} from "@/server/services/attachment.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions Pièce jointe - confirme l'enregistrement d'une PJ déjà téléversée en S3
 * (via URL presignée) et supprime une PJ. Autorisation : mêmes règles que l'édition
 * du ticket.
 *
 * DEUX AUTORISATIONS DISTINCTES, et c'est le fond de l'affaire : DÉPOSER est
 * ouvert à tout membre du projet (`canAttachToTicket`), comme commenter -
 * joindre une capture au ticket d'un collègue est une contribution, pas une
 * modification. RETIRER reste au déposant, ou à qui répond du ticket
 * (`canRemoveAttachment`). « L'UI masque, le serveur impose. »
 */

const confirmAttachmentSchema = z.object({
  ticketId: z.string().min(1),
  filename: z.string().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z
    .number()
    .int()
    .positive()
    .max(10 * 1024 * 1024, "10 Mo maximum"),
  storageKey: z.string().min(1),
});

/** Enregistre les métadonnées d'une pièce jointe après upload S3 réussi. */
export async function confirmAttachmentAction(
  input: z.input<typeof confirmAttachmentSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = confirmAttachmentSchema.parse(input);
    /**
     * TYPE DÉCLARÉ, VÉRIFIÉ ICI AUSSI.
     *
     * Cette action était la seule des cinq voies d'écriture à ne pas appeler
     * `isDangerousContentType` - les deux routes de téléversement, la route de
     * pré-signature et l'action jumelle du wiki le font toutes.
     *
     * L'oubli était exploitable : on téléversait la charge sous un type inoffensif,
     * puis on rappelait CETTE action avec la même clé et `text/html`. La seule
     * garde portait sur la clé (`attachments/<ticket>/`), satisfaite. La route de
     * téléchargement sert alors les octets en `inline`, sur l'origine de
     * l'application - script exécuté dans la session de qui ouvre la pièce jointe.
     *
     * Le commentaire de cette route affirmait justement l'invariant que ce
     * chemin-ci ne tenait pas : « types dangereux déjà refusés à l'upload ».
     */
    if (isDangerousContentType(data.contentType)) {
      return { ok: false, error: "Type de fichier non autorisé." };
    }
    // M2 - la clé doit être celle émise pour CE ticket (empêche de confirmer un objet S3 arbitraire).
    if (!data.storageKey.startsWith(`attachments/${data.ticketId}/`)) {
      return { ok: false, error: "Clé de stockage invalide." };
    }
    const ticket = await getTicketOwnership(data.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(
      canAttachToTicket(user),
      "Ajout de pièce jointe non autorisé sur ce ticket.",
    );
    const attachment = await createAttachment({
      ticketId: data.ticketId,
      filename: data.filename,
      contentType: data.contentType,
      size: data.size,
      storageKey: data.storageKey,
      uploadedById: user.id,
    });
    revalidatePath("/tickets");
    return { ok: true, data: { id: attachment.id } };
  });
}

/** Supprime une pièce jointe (métadonnées ; l'objet S3 reste à purger séparément). */
export async function deleteAttachmentAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    const attachment = await getAttachment(id);
    if (!attachment) return { ok: false, error: "Pièce jointe introuvable." };
    const ticket = await getTicketOwnership(attachment.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(
      canRemoveAttachment(user, attachment, ticket),
      "Seul le déposant d'une pièce jointe, ou qui répond du ticket, peut la retirer.",
    );
    await deleteAttachment(id);
    revalidatePath("/tickets");
    return { ok: true };
  });
}
