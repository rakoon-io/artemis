"use server";

import { revalidatePath } from "next/cache";
import { assert, canComment, canEditComment } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { createCommentSchema, updateCommentSchema } from "@/lib/validators";
import {
  createComment,
  getCommentOwnership,
  updateComment,
} from "@/server/services/comment.service";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { notifyNewComment } from "@/server/notifications";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Ajoute un commentaire à un ticket. Tout utilisateur connecté ; auteur = user. */
export async function createCommentAction(
  ticketId: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(canComment(user), "Vous devez être connecté pour commenter.");
    const data = createCommentSchema.parse({ ticketId, body });
    const ticket = await getTicketOwnership(data.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    const comment = await createComment(data.ticketId, user.id, data.body);
    // Notifie les concernes (rapporteur + assigne), sans bloquer la reponse.
    void notifyNewComment(data.ticketId, user.id, data.body);
    revalidatePath("/tickets");
    return { ok: true, data: { id: comment.id } };
  });
}

/**
 * Retouche un commentaire. Son AUTEUR seul (cf. `canEditComment`), et seulement
 * s'il a toujours acces au projet : perdre l'acces, c'est aussi perdre la main
 * sur ce qu'on y avait ecrit.
 *
 * Aucune notification : corriger une coquille ne vaut pas de reveiller le fil,
 * que le commentaire d'origine a deja notifie.
 */
export async function updateCommentAction(
  id: string,
  body: string,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateCommentSchema.parse({ id, body });
    const comment = await getCommentOwnership(data.id);
    if (!comment) return { ok: false, error: "Commentaire introuvable." };
    assert(
      canEditComment(user, comment),
      "Vous ne pouvez modifier que vos propres commentaires.",
    );
    const ticket = await getTicketOwnership(comment.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    const updated = await updateComment(data.id, data.body);
    revalidatePath("/tickets");
    return { ok: true, data: { id: updated.id } };
  });
}
