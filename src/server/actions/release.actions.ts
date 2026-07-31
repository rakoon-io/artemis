"use server";

import type { z } from "zod";
import { assertProjectAccess } from "@/server/access";
import { createReleaseSchema, updateReleaseSchema } from "@/lib/validators";
import {
  createRelease,
  deleteRelease,
  getReleaseProjectId,
  setReleaseState,
  updateRelease,
} from "@/server/services/release.service";
import { revalidateBoardAndList, withUser, type SessionUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions VERSION (« Release » en base).
 *
 * Ouvertes à tout membre du projet, comme les sprints : décider de ce qu'on
 * livre et quand fait partie du travail courant, pas de la configuration. L'accès
 * au projet, lui, est imposé côté serveur - « l'UI masque, le serveur impose ».
 */

/** Garde : l'utilisateur doit avoir accès au projet de la version. */
async function assertReleaseAccess(
  user: SessionUser,
  releaseId: string,
): Promise<string | null> {
  const projectId = await getReleaseProjectId(releaseId);
  if (!projectId) return null;
  await assertProjectAccess(user, projectId);
  return projectId;
}

export async function createReleaseAction(
  input: z.input<typeof createReleaseSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = createReleaseSchema.parse(input);
    await assertProjectAccess(user, data.projectId);
    const release = await createRelease(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: release.id } };
  });
}

export async function updateReleaseAction(
  input: z.input<typeof updateReleaseSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateReleaseSchema.parse(input);
    const projectId = await assertReleaseAccess(user, data.id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await updateRelease(data);
    revalidateBoardAndList();
    return { ok: true, data: { id: data.id } };
  });
}

/** Livre une version, ou la remet en préparation. */
export async function setReleaseStateAction(
  id: string,
  released: boolean,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const projectId = await assertReleaseAccess(user, id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await setReleaseState(id, released);
    revalidateBoardAndList();
    return { ok: true, data: { id } };
  });
}

/** Supprime une version. Les tickets qu'elle portait la perdent, sans disparaître. */
export async function deleteReleaseAction(
  id: string,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const projectId = await assertReleaseAccess(user, id);
    if (!projectId) return { ok: false, error: "Version introuvable." };
    await deleteRelease(id);
    revalidateBoardAndList();
    return { ok: true, data: { id } };
  });
}
