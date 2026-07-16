import { Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/**
 * Acteur du serveur MCP : le compte de service au nom duquel l'IA agit. Il est
 * choisi par la variable d'environnement ARTEMIS_MCP_ACTOR_EMAIL (defaut
 * bot@rakoon.io) et doit exister en base. Les memes regles d'acces que le web
 * s'appliquent (membre du projet, ou administrateur).
 */
export interface Actor {
  id: string;
  role: Role;
  name: string | null;
  email: string;
}

const DEFAULT_ACTOR_EMAIL = "bot@rakoon.io";

/** Resout l'acteur depuis l'environnement, ou leve une erreur explicite. */
export async function resolveActor(): Promise<Actor> {
  const email = (
    process.env.ARTEMIS_MCP_ACTOR_EMAIL ?? DEFAULT_ACTOR_EMAIL
  ).toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, name: true, email: true },
  });
  if (!user) {
    throw new Error(
      `Compte de service introuvable pour ARTEMIS_MCP_ACTOR_EMAIL="${email}". ` +
        `Creez ce compte (npm run db:seed cree bot@rakoon.io) ou ajustez la variable.`,
    );
  }
  return user;
}
