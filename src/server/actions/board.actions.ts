"use server";

import type { z } from "zod";
import { assert, canMoveTicket } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { rankBetween } from "@/lib/rank";
import { moveTicketSchema } from "@/lib/validators";
import {
  getTicketOwnership,
  lastRankInColumn,
  moveTicket,
} from "@/server/services/ticket.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Déplace un ticket (colonne + position) sur le Kanban. Mêmes droits que l'édition.
 * Le rang inséré est calculé entre les deux voisines (`afterRank`, `beforeRank`).
 *
 * SANS VOISINE DÉCLARÉE, le ticket va À LA FIN de la colonne. C'est le cas du
 * changement de statut depuis la liste des tickets : le geste dit dans quelle
 * colonne, pas à quelle place. Calculer un rang entre deux bords absents
 * l'aurait déposé au milieu, devant des cartes traitées avant lui.
 */
export async function moveTicketAction(
  input: z.input<typeof moveTicketSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = moveTicketSchema.parse(input);
    const ticket = await getTicketOwnership(data.ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(canMoveTicket(user, ticket), "Déplacement de ce ticket non autorisé.");
    const positioned = data.afterRank != null || data.beforeRank != null;
    const after = positioned
      ? (data.afterRank ?? null)
      : await lastRankInColumn(data.columnId);
    const rank = rankBetween(after, data.beforeRank ?? null);
    await moveTicket(data.ticketId, data.columnId, rank);
    revalidateBoardAndList();
    return { ok: true, data: { id: data.ticketId } };
  });
}
