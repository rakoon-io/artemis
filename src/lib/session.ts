import { Role } from "@prisma/client";
import { auth } from "@/auth";
import type { PolicyUser } from "./policies";

/** Utilisateur courant (id + rôle) côté serveur, ou null si non connecté. */
export async function currentUser(): Promise<
  (PolicyUser & { email: string; name: string | null }) | null
> {
  const session = await auth();
  if (!session?.user?.id) return null;
  return {
    id: session.user.id,
    role: (session.user.role ?? Role.REPORTER) as Role,
    email: session.user.email ?? "",
    name: session.user.name ?? null,
  };
}

/** Variante qui lève si non connecté (usage dans les actions/services protégés). */
export async function requireUser() {
  const user = await currentUser();
  if (!user) throw new Error("Non authentifié");
  return user;
}
