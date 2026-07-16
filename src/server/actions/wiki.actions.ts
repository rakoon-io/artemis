"use server";

import type { z } from "zod";
import { assert, isAdmin } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { descendantIds } from "@/lib/wiki-tree";
import { createWikiPageSchema, updateWikiPageSchema } from "@/lib/validators";
import {
  createWikiPage,
  deleteWikiPage,
  getWikiPage,
  listWikiPages,
  updateWikiPage,
} from "@/server/services/wiki.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Vérifie qu'une page parente existe et appartient bien au projet. */
async function parentInProject(
  parentId: string,
  projectId: string,
): Promise<boolean> {
  const parent = await getWikiPage(parentId);
  return !!parent && parent.projectId === projectId;
}

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
    await assertProjectAccess(user, data.projectId);
    if (data.parentId && !(await parentInProject(data.parentId, data.projectId))) {
      return { ok: false, error: "Page parente invalide." };
    }
    const page = await createWikiPage({
      projectId: data.projectId,
      title: data.title,
      content: data.content,
      authorId: user.id,
      parentId: data.parentId,
    });
    return { ok: true, data: { id: page.id } };
  });
}

/** Met à jour le titre et le contenu d'une page. */
export async function updateWikiPageAction(
  input: z.input<typeof updateWikiPageSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    const data = updateWikiPageSchema.parse(input);
    const existing = await getWikiPage(data.id);
    if (!existing) return { ok: false, error: "Page introuvable." };
    await assertProjectAccess(user, existing.projectId);

    if (data.parentId) {
      if (data.parentId === data.id) {
        return { ok: false, error: "Une page ne peut pas etre sa propre parente." };
      }
      if (!(await parentInProject(data.parentId, existing.projectId))) {
        return { ok: false, error: "Page parente invalide." };
      }
      // Anti-cycle : interdit de placer une page sous une de ses descendantes.
      const pages = await listWikiPages(existing.projectId);
      if (descendantIds(pages, data.id).has(data.parentId)) {
        return {
          ok: false,
          error: "Impossible de deplacer une page sous une de ses sous-pages.",
        };
      }
    }

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
