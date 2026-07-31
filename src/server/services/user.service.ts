import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canonicalEmail } from "@/lib/email-address";

/** Service Utilisateur - minimisation RGPD : n'expose que id/name/email/role. */

/** Sélection publique : jamais de `passwordHash` renvoyé au client. */
const publicUserSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
} as const;

export function listUsers() {
  return prisma.user.findMany({
    select: publicUserSelect,
    orderBy: { name: "asc" },
  });
}

export function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: publicUserSelect,
  });
}

export function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email: canonicalEmail(email) },
    select: publicUserSelect,
  });
}

/** Nombre d'administrateurs (sert à garantir « au moins un admin »). */
export function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: Role.ADMIN } });
}

/** Vrai si l'utilisateur a déjà un mot de passe (compte actif) - jamais exposé au client. */
export function userHasPassword(id: string): Promise<boolean> {
  return prisma.user
    .findUnique({ where: { id }, select: { passwordHash: true } })
    .then((u) => !!u?.passwordHash);
}

export interface CreateUserServiceInput {
  name: string;
  email: string;
  /** Optionnel : absent => compte sans mot de passe (activation par lien). */
  password?: string;
  role: Role;
}

/**
 * Crée un utilisateur (mot de passe haché en bcrypt 12, ou aucun mot de passe si
 * absent - l'utilisateur le définira via un lien de première connexion). Lève une
 * erreur claire si l'e-mail est déjà pris (pré-vérification + garde P2002).
 */
export async function createUser(input: CreateUserServiceInput) {
  /**
   * Canonisé ici AUSSI, et non seulement dans le schéma Zod : ce service est
   * appelé depuis l'amorçage et depuis MCP, qui n'ont pas de formulaire et donc
   * pas de schéma en amont. Le doublon d'appel ne coûte rien, l'oubli coûterait
   * un second compte pour une même boîte aux lettres.
   */
  const email = canonicalEmail(input.email);
  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) throw new Error("Cet e-mail est déjà utilisé.");

  const passwordHash = input.password
    ? await bcrypt.hash(input.password, 12)
    : null;
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash,
        role: input.role,
      },
      select: publicUserSelect,
    });
  } catch (error) {
    // Course sur la contrainte d'unicité de l'e-mail.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new Error("Cet e-mail est déjà utilisé.");
    }
    throw error;
  }
}

/**
 * Change le rôle, et COUPE les sessions ouvertes du compte.
 *
 * Le jeton relit la base au plus une fois par minute : sans incrémenter le
 * compteur, une rétrogradation mettrait jusqu'à soixante secondes à mordre. Ce
 * n'est pas grand-chose, sauf que ce geste se fait précisément dans l'urgence -
 * on retire ses droits à quelqu'un dont on ne veut plus. L'incrément rend la
 * session invalide au prochain appel, et la personne se reconnecte avec son
 * nouveau rôle.
 */
export function updateUserRole(id: string, role: Role) {
  return prisma.user.update({
    where: { id },
    data: { role, sessionEpoch: { increment: 1 } },
    select: publicUserSelect,
  });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
