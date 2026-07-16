"use server";

import type { z } from "zod";
import { assert, can, canCreateTicket, canEditTicket } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { createTicketSchema, updateTicketSchema } from "@/lib/validators";
import {
  createTicket,
  deleteTicket,
  getTicketOwnership,
  updateTicket,
} from "@/server/services/ticket.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Crée un ticket dans le projet ciblé. Tout utilisateur connecté ; reporter = user. */
export async function createTicketAction(
  input: z.input<typeof createTicketSchema>,
): Promise<ActionResult<{ id: string; key: string }>> {
  return withUser<{ id: string; key: string }>(async (user) => {
    assert(canCreateTicket(user), "Vous devez être connecté pour créer un ticket.");
    const data = createTicketSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const ticket = await createTicket(
      {
        projectId: data.projectId,
        title: data.title,
        description: data.description ?? null,
        typeId: data.typeId,
        priorityId: data.priorityId,
        assigneeId: data.assigneeId ?? null,
        sprintId: data.sprintId ?? null,
        labelIds: data.labelIds,
      },
      user.id,
    );
    revalidateBoardAndList();
    return { ok: true, data: { id: ticket.id, key: ticket.key } };
  });
}

/** Met à jour un ticket. Admin partout ; Rapporteur sur ses tickets (reporter/assigné). */
export async function updateTicketAction(
  input: z.input<typeof updateTicketSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateTicketSchema.parse(input);
    const ticket = await getTicketOwnership(data.id);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(canEditTicket(user, ticket), "Modification de ce ticket non autorisée.");
    await updateTicket({
      id: data.id,
      title: data.title,
      description: data.description,
      typeId: data.typeId,
      priorityId: data.priorityId,
      assigneeId: data.assigneeId,
      sprintId: data.sprintId,
      labelIds: data.labelIds,
    });
    revalidateBoardAndList();
    return { ok: true, data: { id: data.id } };
  });
}

/** Supprime un ticket. Réservé à l'Admin (`delete_ticket`). */
export async function deleteTicketAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "delete_ticket"), "Suppression réservée aux administrateurs.");
    await deleteTicket(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Affecte un ticket à un sprint, ou l'en retire (sprintId = null renvoie au backlog). */
export async function setTicketSprintAction(
  ticketId: string,
  sprintId: string | null,
): Promise<ActionResult> {
  return withUser(async (user) => {
    const ticket = await getTicketOwnership(ticketId);
    if (!ticket) return { ok: false, error: "Ticket introuvable." };
    await assertProjectAccess(user, ticket.projectId);
    assert(canEditTicket(user, ticket), "Modification de ce ticket non autorisée.");
    await updateTicket({ id: ticketId, sprintId });
    revalidateBoardAndList();
    return { ok: true };
  });
}
