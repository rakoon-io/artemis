"use server";

import { getColumnProject } from "@/server/services/column.service";
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
    /**
     * LA COLONNE DOIT ÊTRE CELLE DU PROJET DU TICKET.
     *
     * Les gardes ci-dessus valident le TICKET, jamais la CIBLE. On pouvait donc
     * déplacer son propre ticket dans une colonne d'un projet voisin : la clé
     * étrangère tient - les colonnes vivent dans une table commune -, et le
     * ticket disparaissait alors du tableau, ne correspondant plus à aucune de
     * ses colonnes. Invisible ici, irréparable depuis l'interface, et le nom de
     * la colonne d'en face s'affichait au passage dans les listes.
     */
    const column = await getColumnProject(data.columnId);
    if (column?.projectId !== ticket.projectId) {
      return { ok: false, error: "Colonne inconnue pour ce projet." };
    }
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
