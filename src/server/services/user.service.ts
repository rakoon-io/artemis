import { prisma } from "@/lib/db";

/** Service Utilisateur — minimisation RGPD : n'expose que id/name/email/role. */

export function listUsers() {
  return prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true },
    orderBy: { name: "asc" },
  });
}
