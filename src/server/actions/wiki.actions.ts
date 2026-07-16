"use server";

import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import { createWikiPageSchema, updateWikiPageSchema } from "@/lib/validators";
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  updateWikiPage,
} from "@/server/services/wiki.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions Wiki. Création et édition ouvertes à tout utilisateur connecté
 * (documentation collaborative) ; suppression réservée aux administrateurs.
 * L'autorisation est imposée côté serveur.
 */

/** Crée une page de wiki dans le projet. */
export async function createWikiPageAction(
  input: z.input<typeof createWikiPageSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = createWikiPageSchema.parse(input);
    const page = await createWikiPage({
      projectId: data.projectId,
      title: data.title,
      content: data.content,
      authorId: user.id,
    });
    return { ok: true, data: { id: page.id } };
  });
}

/** Met à jour le titre et le contenu d'une page. */
export async function updateWikiPageAction(
  input: z.input<typeof updateWikiPageSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async () => {
    const data = updateWikiPageSchema.parse(input);
    const existing = await getWikiPage(data.id);
    if (!existing) return { ok: false, error: "Page introuvable." };
    await updateWikiPage(data);
    return { ok: true, data: { id: data.id } };
  });
}

/** Supprime une page. Réservé aux administrateurs. */
export async function deleteWikiPageAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(isAdmin(user), "Suppression réservée aux administrateurs.");
    const existing = await getWikiPage(id);
    if (!existing) return { ok: false, error: "Page introuvable." };
    await deleteWikiPage(id);
    return { ok: true };
  });
}
