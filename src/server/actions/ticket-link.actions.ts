"use server";

import { revalidatePath } from "next/cache";
import { assert, canEditTicket } from "@/lib/policies";
import { refuseLink } from "@/lib/ticket-links";
import {
  createTicketLinkSchema,
  deleteTicketLinkSchema,
} from "@/lib/validators";
import { assertProjectAccess } from "@/server/access";
import {
  getLinkOwnership,
  linkTickets,
  unlinkTickets,
} from "@/server/services/ticket-link.service";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * LIER DEUX TICKETS.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * QUI A LE DROIT
 *
 * Poser un lien, c'est modifier les DEUX fiches : celle d'où l'on part comme
 * celle d'en face, qui affichera « est bloqué par ». On exige donc le droit
 * d'édition sur les deux, et l'accès au projet. Le contraire permettrait
 * d'accrocher une dépendance bloquante au ticket d'un tiers sans qu'il puisse
 * s'y opposer.
 *
 * L'accès au projet est vérifié une fois : les deux tickets appartiennent
 * forcément au même, `refuseLink` s'en assure juste avant.
 */
export async function createTicketLinkAction(
  sourceId: string,
  targetId: string,
  type: "BLOCKS" | "DUPLICATES" | "RELATES",
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = createTicketLinkSchema.parse({ sourceId, targetId, type });

    const [source, target] = await Promise.all([
      getTicketOwnership(data.sourceId),
      getTicketOwnership(data.targetId),
    ]);
    if (!source || !target) return { ok: false, error: "Ticket introuvable." };

    const refus = refuseLink(source, target);
    if (refus === "SELF") {
      return { ok: false, error: "Un ticket ne peut pas être lié à lui-même." };
    }
    if (refus === "OTHER_PROJECT") {
      return {
        ok: false,
        error: "Les deux tickets doivent appartenir au même projet.",
      };
    }

    await assertProjectAccess(user, source.projectId);
    assert(
      canEditTicket(user, source) && canEditTicket(user, target),
      "Vous devez pouvoir modifier les deux tickets pour les lier.",
    );

    const lien = await linkTickets(
      data.sourceId,
      data.targetId,
      data.type,
      user.id,
    );
    revalidatePath("/tickets");
    return { ok: true, data: { id: lien.id } };
  });
}

/**
 * DÉLIER. Mêmes exigences que pour lier : le retrait vaut modification des deux
 * fiches, il ne peut pas être plus ouvert que la pose.
 */
export async function deleteTicketLinkAction(
  id: string,
): Promise<ActionResult> {
  return withUser(async (user) => {
    const data = deleteTicketLinkSchema.parse({ id });
    const lien = await getLinkOwnership(data.id);
    if (!lien) return { ok: false, error: "Lien introuvable." };

    await assertProjectAccess(user, lien.source.projectId);
    const [source, target] = await Promise.all([
      getTicketOwnership(lien.source.id),
      getTicketOwnership(lien.target.id),
    ]);
    assert(
      !!source &&
        !!target &&
        canEditTicket(user, source) &&
        canEditTicket(user, target),
      "Vous devez pouvoir modifier les deux tickets pour retirer ce lien.",
    );

    await unlinkTickets(data.id);
    revalidatePath("/tickets");
    return { ok: true, data: undefined };
  });
}
