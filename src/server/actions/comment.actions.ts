"use server";

import { revalidatePath } from "next/cache";
import { assert, canComment } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { createCommentSchema } from "@/lib/validators";
import { createComment } from "@/server/services/comment.service";
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
