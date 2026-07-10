import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";

/** Service Utilisateur — minimisation RGPD : n'expose que id/name/email/role. */

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

/** Nombre d'administrateurs (sert à garantir « au moins un admin »). */
export function countAdmins(): Promise<number> {
  return prisma.user.count({ where: { role: Role.ADMIN } });
}

export interface CreateUserServiceInput {
  name: string;
  email: string;
  password: string;
  role: Role;
}

/**
 * Crée un utilisateur (mot de passe haché en bcrypt 12). Lève une erreur claire
 * si l'e-mail est déjà pris (pré-vérification + garde anti-course sur P2002).
 */
export async function createUser(input: CreateUserServiceInput) {
  const existing = await prisma.user.findUnique({
    where: { email: input.email },
    select: { id: true },
  });
  if (existing) throw new Error("Cet e-mail est déjà utilisé.");

  const passwordHash = await bcrypt.hash(input.password, 12);
  try {
    return await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
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

export function updateUserRole(id: string, role: Role) {
  return prisma.user.update({
    where: { id },
    data: { role },
    select: publicUserSelect,
  });
}

export function deleteUser(id: string) {
  return prisma.user.delete({ where: { id } });
}
