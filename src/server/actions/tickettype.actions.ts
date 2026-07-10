"use server";

import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import {
  createTicketTypeSchema,
  reorderTicketTypesSchema,
  updateTicketTypeSchema,
} from "@/lib/validators";
import {
  createTicketType,
  deleteTicketType,
  reorderTicketTypes,
  updateTicketType,
} from "@/server/services/tickettype.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

const FORBIDDEN = "Gestion des types de tickets réservée aux administrateurs.";

/** Crée un type de ticket (placé en fin de liste). Réservé à l'Admin. */
export async function createTicketTypeAction(
  input: z.input<typeof createTicketTypeSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = createTicketTypeSchema.parse(input);
    const type = await createTicketType(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: type.id } };
  });
}

/** Renomme un type / change sa couleur. Réservé à l'Admin. */
export async function updateTicketTypeAction(
  input: z.input<typeof updateTicketTypeSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = updateTicketTypeSchema.parse(input);
    const type = await updateTicketType(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: type.id } };
  });
}

/** Réordonne les types d'un projet (ordre = position dans `orderedIds`). Admin. */
export async function reorderTicketTypesAction(
  input: z.input<typeof reorderTicketTypesSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    const data = reorderTicketTypesSchema.parse(input);
    await reorderTicketTypes(data.projectId, data.orderedIds);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Supprime un type. Refusé (message explicite) si des tickets l'utilisent. Admin. */
export async function deleteTicketTypeAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), FORBIDDEN);
    try {
      await deleteTicketType(id);
    } catch (error) {
      // Type « en cours d'utilisation » → message métier, pas d'exception vers le client.
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Suppression impossible.",
      };
    }
    revalidateBoardAndList();
    return { ok: true };
  });
}
