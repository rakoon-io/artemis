"use server";

import { revalidatePath } from "next/cache";
import { assert, canRemoveAttachment } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { getTicketOwnership } from "@/server/services/ticket.service";
import {
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
