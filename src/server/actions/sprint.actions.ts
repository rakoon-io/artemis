"use server";

import { z } from "zod";
import { SprintState } from "@prisma/client";
import { assert, can } from "@/lib/policies";
import { createSprintSchema } from "@/lib/validators";
import {
  createSprint,
  deleteSprint,
  setSprintState,
  updateSprint,
} from "@/server/services/sprint.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Crée un sprint. Réservé à l'Admin. */
export async function createSprintAction(
  input: z.input<typeof createSprintSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_sprints"), "Gestion des sprints réservée aux administrateurs.");
    const data = createSprintSchema.parse(input);
    const sprint = await createSprint(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/** Met à jour un sprint (nom, objectif, dates). Réservé à l'Admin. */
export async function updateSprintAction(
  id: string,
  input: z.input<typeof createSprintSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_sprints"), "Gestion des sprints réservée aux administrateurs.");
    const data = createSprintSchema.parse(input);
    const sprint = await updateSprint({
      id,
      name: data.name,
      goal: data.goal,
      startDate: data.startDate,
      endDate: data.endDate,
    });
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/** Change l'état d'un sprint (PLANNED / ACTIVE / COMPLETED). Réservé à l'Admin. */
export async function setSprintStateAction(
  id: string,
  state: SprintState,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_sprints"), "Gestion des sprints réservée aux administrateurs.");
    const value = z.nativeEnum(SprintState).parse(state);
    const sprint = await setSprintState(id, value);
    revalidateBoardAndList();
    return { ok: true, data: { id: sprint.id } };
  });
}

/** Supprime un sprint (ses tickets sont détachés). Réservé à l'Admin. */
export async function deleteSprintAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_sprints"), "Gestion des sprints réservée aux administrateurs.");
    await deleteSprint(id);
    revalidateBoardAndList();
    return { ok: true };
  });
}
