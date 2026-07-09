"use server";

import type { z } from "zod";
import { assert, canMoveTicket } from "@/lib/policies";
import { rankBetween } from "@/lib/rank";
import { moveTicketSchema } from "@/lib/validators";
import { getTicketOwnership, moveTicket } from "@/server/services/ticket.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Déplace un ticket (colonne + position) sur le Kanban. Mêmes droits que l'édition.
 * Le rang inséré est calculé entre les deux voisines (`afterRank`, `beforeRank`).
 */
export async function moveTicketAction(
  input: z.input<typeof moveTicketSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = moveTicketSchema.parse(input);
    const ticket = await getTicketOwnership(data.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    assert(canMoveTicket(user, ticket), "Déplacement de ce ticket non autorisé.");
    const rank = rankBetween(data.afterRank ?? null, data.beforeRank ?? null);
    await moveTicket(data.ticketId, data.columnId, rank);
    revalidateBoardAndList();
    return { ok: true, data: { id: data.ticketId } };
  });
}
