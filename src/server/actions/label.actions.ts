"use server";

import type { z } from "zod";
import { assert, can } from "@/lib/policies";
import { createLabelSchema } from "@/lib/validators";
import { createLabel, deleteLabel } from "@/server/services/label.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Crée un label de projet. Réservé à l'Admin. */
export async function createLabelAction(
  input: z.input<typeof createLabelSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_labels"), "Gestion des labels réservée aux administrateurs.");
    const data = createLabelSchema.parse(input);
    const label = await createLabel(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: label.id } };
  });
}

/** Supprime un label (retiré de tous les tickets par cascade). Réservé à l'Admin. */
export async function deleteLabelAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_labels"), "Gestion des labels réservée aux administrateurs.");
    await deleteLabel(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
