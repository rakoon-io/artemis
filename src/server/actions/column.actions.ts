"use server";

import type { z } from "zod";
import { assert, can } from "@/lib/policies";
import {
  createColumnSchema,
  reorderColumnsSchema,
  updateColumnSchema,
} from "@/lib/validators";
import {
  createColumn,
  deleteColumn,
  reorderColumns,
  updateColumn,
} from "@/server/services/column.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Ajoute une colonne (placée en fin de tableau). Réservé à l'Admin. */
export async function createColumnAction(
  input: z.input<typeof createColumnSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_columns"), "Gestion des colonnes réservée aux administrateurs.");
    const data = createColumnSchema.parse(input);
    const column = await createColumn(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: column.id } };
  });
}

/** Renomme une colonne / change sa limite WIP. Réservé à l'Admin. */
export async function updateColumnAction(
  input: z.input<typeof updateColumnSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_columns"), "Gestion des colonnes réservée aux administrateurs.");
    const data = updateColumnSchema.parse(input);
    const column = await updateColumn(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: column.id } };
  });
}

/** Réordonne les colonnes d'un projet (ordre = position dans `orderedIds`). Admin. */
export async function reorderColumnsAction(
  input: z.input<typeof reorderColumnsSchema>,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_columns"), "Gestion des colonnes réservée aux administrateurs.");
    const data = reorderColumnsSchema.parse(input);
    await reorderColumns(data.projectId, data.orderedIds);
    revalidateBoardAndList();
    return { ok: true };
  });
}

/** Supprime une colonne (ses tickets migrent vers la 1re colonne). Réservé à l'Admin. */
export async function deleteColumnAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_columns"), "Gestion des colonnes réservée aux administrateurs.");
    await deleteColumn(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
