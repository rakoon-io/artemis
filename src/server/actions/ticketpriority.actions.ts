"use server";

import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import {
  createTicketPrioritySchema,
  reorderTicketPrioritiesSchema,
  updateTicketPrioritySchema,
} from "@/lib/validators";
import {
  createTicketPriority,
  deleteTicketPriority,
  reorderTicketPriorities,
  updateTicketPriority,
} from "@/server/services/ticketpriority.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

const FORBIDDEN = "Gestion des priorités réservée aux administrateurs.";

/** Crée une priorité (placée en fin de liste). Réservé à l'Admin. */
export async function createTicketPriorityAction(
  input: z.input<typeof createTicketPrioritySchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = createTicketPrioritySchema.parse(input);
    const priority = await createTicketPriority(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: priority.id } };
  });
}

/** Renomme une priorité / change sa couleur. Réservé à l'Admin. */
export async function updateTicketPriorityAction(
  input: z.input<typeof updateTicketPrioritySchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = updateTicketPrioritySchema.parse(input);
    const priority = await updateTicketPriority(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: priority.id } };
  });
}

/** Réordonne les priorités d'un projet (ordre = position dans `orderedIds`). Admin. */
export async function reorderTicketPrioritiesAction(
  input: z.input<typeof reorderTicketPrioritiesSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = reorderTicketPrioritiesSchema.parse(input);
    await reorderTicketPriorities(data.projectId, data.orderedIds);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Supprime une priorité. Refusé (message explicite) si des tickets l'utilisent. Admin. */
export async function deleteTicketPriorityAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    try {
      await deleteTicketPriority(id);
    } catch (error) {
      // Priorité « en cours d'utilisation » → message métier, pas d'exception vers le client.
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Suppression impossible.",
      };
    }
    revalidateBoardAndList();
    return { ok: true };
  });
}
