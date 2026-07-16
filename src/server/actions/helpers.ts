import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { ForbiddenError } from "@/lib/policies";
import { currentUser } from "@/lib/session";
import type { ActionResult } from "./types";

/**
 * Utilitaires partagés des Server Actions (module « normal », sans `"use server"`
 * - un fichier `"use server"` ne peut exporter que des actions async).
 */

/** Utilisateur de session (non nul), tel que renvoyé par `currentUser()`. */
export type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

/** Traduit une exception en message utilisateur (FR), sans fuiter d'interne. */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ForbiddenError) return error.message;
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Données invalides.";
  }
  if (error instanceof Error) return error.message;
  return "Une erreur inattendue est survenue.";
}

/**
 * Enveloppe une action : exige un utilisateur connecté puis exécute `handler`,
 * en convertissant toute exception (ForbiddenError, ZodError, …) en
 * `{ ok: false, error }`. « L'UI masque, le serveur impose. »
 */
export async function withUser<T = void>(
  handler: (user: SessionUser) => Promise<ActionResult<T>>,
): Promise<ActionResult<T>> {
  try {
    const user = await currentUser();
    if (!user) return { ok: false, error: "Vous devez être connecté." };
    return await handler(user);
  } catch (error) {
    return { ok: false, error: toErrorMessage(error) };
  }
}

/** Revalide les vues impactées par une mutation de ticket / colonne / sprint / label. */
export function revalidateBoardAndList(): void {
  revalidatePath("/board");
  revalidatePath("/tickets");
}
