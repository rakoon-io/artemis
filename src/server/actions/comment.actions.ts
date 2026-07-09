"use server";

import { revalidatePath } from "next/cache";
import { assert, canComment } from "@/lib/policies";
import { createCommentSchema } from "@/lib/validators";
import { createComment } from "@/server/services/comment.service";
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
    const comment = await createComment(data.ticketId, user.id, data.body);
    revalidatePath("/tickets");
    return { ok: true, data: { id: comment.id } };
  });
}
