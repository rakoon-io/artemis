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

/**
 * Traduit une exception en message utilisateur, sans fuiter d'interne.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUI FUYAIT
 *
 * La dernière ligne renvoyait `error.message` pour N'IMPORTE QUELLE exception.
 * Le cas qui fait mal est Prisma : son message porte l'opération échouée, le
 * modèle et le champ en cause, le nom de la contrainte, le chemin absolu du
 * bundle sur le serveur, et jusqu'aux arguments de la requête - donc, sur une
 * recherche d'utilisateur, l'adresse cherchée. Affiché à qui a provoqué
 * l'erreur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI PAS UNE LISTE BLANCHE
 *
 * L'orthodoxie voudrait n'autoriser que des erreurs marquées « pour
 * l'utilisateur ». Mais cinquante-six `throw new Error(...)` peuplent les
 * services, et ce sont, à la lecture, des phrases françaises écrites POUR être
 * lues : « Le projet ne possède aucune colonne. », « Ce type est utilisé par des
 * tickets. » Les convertir en bloc, c'était cinquante-six occasions d'en
 * transformer une en « Une erreur inattendue est survenue » sans s'en
 * apercevoir.
 *
 * On bloque donc la fuite avérée - les exceptions de Prisma, seules à porter de
 * l'interne - et l'on garde les messages écrits à la main. Le jour où ces
 * derniers deviendront trop nombreux pour qu'on les relise, la liste blanche
 * sera le bon geste ; aujourd'hui, elle coûterait plus qu'elle ne protège.
 */
export function toErrorMessage(error: unknown): string {
  if (error instanceof ForbiddenError) return error.message;
  if (error instanceof ZodError) {
    return error.issues[0]?.message ?? "Données invalides.";
  }
  if (isPrismaError(error)) {
    // Journalisé, jamais renvoyé : c'est là qu'on diagnostique.
    console.error("[action] erreur base de données", error);
    return "Une erreur inattendue est survenue.";
  }
  if (error instanceof Error) return error.message;
  return "Une erreur inattendue est survenue.";
}

/**
 * Une exception venue du client Prisma.
 *
 * Reconnue au NOM de la classe plutôt qu'avec `instanceof` : cela évite de
 * charger le client généré dans ce module, qui est importé par toutes les
 * actions - et couvre du même coup les cinq classes d'erreur de Prisma sans les
 * énumérer une à une.
 */
function isPrismaError(error: unknown): boolean {
  return (
    error instanceof Error && /^PrismaClient\w*Error$/.test(error.constructor.name)
  );
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
