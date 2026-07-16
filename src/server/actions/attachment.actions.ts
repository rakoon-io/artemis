"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { assert, canEditTicket } from "@/lib/policies";
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
 * du ticket (`canEditTicket`). « L'UI masque, le serveur impose. »
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
    // M2 - la clé doit être celle émise pour CE ticket (empêche de confirmer un objet S3 arbitraire).
    if (!data.storageKey.startsWith(`attachments/${data.ticketId}/`)) {
      return { ok: false, error: "Clé de stockage invalide." };
    }
    const ticket = await getTicketOwnership(data.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(
      canEditTicket(user, ticket),
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
      canEditTicket(user, ticket),
      "Suppression de pièce jointe non autorisée.",
    );
    await deleteAttachment(id);
    revalidatePath("/tickets");
    return { ok: true };
  });
}
