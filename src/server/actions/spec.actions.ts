"use server";

import type { z } from "zod";
import { assert, can } from "@/lib/policies";
import { markSpecSchema, publishSpecVersionSchema } from "@/lib/validators";
import { assertProjectAccess } from "@/server/access";
import {
  deleteSpecVersion,
  getSpecPackage,
  markPageAsSpec,
  publishSpecVersion,
  unmarkSpec,
} from "@/server/services/spec.service";
import { getWikiPage } from "@/server/services/wiki.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Actions PAQUET DE SPÉCIFICATIONS.
 *
 * Le partage des droits suit celui du wiki, et l'accentue là où c'est structurel :
 *
 *  - DÉCLARER ou RETIRER une spécification est réservé à l'Admin : cela redéfinit
 *    la nature d'une partie de la documentation, comme configurer les colonnes ou
 *    les modules du projet.
 *  - PUBLIER une version est ouvert à tout membre du projet, comme écrire une page
 *    de wiki : c'est un geste éditorial, il n'écrase rien (les versions
 *    s'empilent) et c'est celui qui rédige qui sait quand un état fait référence.
 *  - SUPPRIMER une version est réservé à l'Admin : c'est la seule entorse à
 *    l'immuabilité de l'archive.
 */

const FORBIDDEN = "Gestion des spécifications réservée aux administrateurs.";

/** Déclare une page de wiki (et son sous-arbre) comme spécification. Admin. */
export async function markPageAsSpecAction(
  input: z.input<typeof markSpecSchema>,
): Promise<ActionResult<{ id: string }>> {
  return withUser<{ id: string }>(async (user) => {
    assert(can(user, "manage_specs"), FORBIDDEN);
    const data = markSpecSchema.parse(input);
    const page = await getWikiPage(data.rootPageId);
    // La page doit exister ET relever du projet annoncé : sans ce contrôle, un
    // `projectId` falsifié rattacherait une spécification au mauvais projet.
    if (!page || page.projectId !== data.projectId) {
      return { ok: false, error: "Page introuvable." };
    }
    try {
      const pack = await markPageAsSpec(data.projectId, data.rootPageId);
      return { ok: true, data: { id: pack.id } };
    } catch (error) {
      // Refus métier (paquet imbriqué, page déjà spécifiée) → message, pas d'exception.
      return {
        ok: false,
        error:
          error instanceof Error ? error.message : "Déclaration impossible.",
      };
    }
  });
}

/** Retire la qualité de spécification. Refusé si des versions sont publiées. Admin. */
export async function unmarkSpecAction(id: string): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_specs"), FORBIDDEN);
    const pack = await getSpecPackage(id);
    if (!pack) return { ok: false, error: "Spécification introuvable." };
    try {
      await unmarkSpec(id);
      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Retrait impossible.",
      };
    }
  });
}

/** Publie une version figée du paquet. Ouvert à tout membre du projet. */
export async function publishSpecVersionAction(
  input: z.input<typeof publishSpecVersionSchema>,
): Promise<ActionResult<{ id: string; number: number }>> {
  return withUser<{ id: string; number: number }>(async (user) => {
    const data = publishSpecVersionSchema.parse(input);
    const pack = await getSpecPackage(data.packageId);
    if (!pack) return { ok: false, error: "Spécification introuvable." };
    await assertProjectAccess(user, pack.projectId);
    const version = await publishSpecVersion({ ...data, publishedById: user.id });
    return { ok: true, data: { id: version.id, number: version.number } };
  });
}

/** Supprime une version publiée par erreur. Admin. */
export async function deleteSpecVersionAction(
  id: string,
): Promise<ActionResult> {
  return withUser(async (user) => {
    assert(can(user, "manage_specs"), FORBIDDEN);
    await deleteSpecVersion(id);
    return { ok: true };
  });
}
