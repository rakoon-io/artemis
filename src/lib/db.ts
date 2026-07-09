import { PrismaClient } from "@prisma/client";

/**
 * Client Prisma en singleton (évite d'épuiser le pool en dev avec le HMR).
 * Seul point d'accès à la base — la logique métier passe par `server/services`.
 */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
