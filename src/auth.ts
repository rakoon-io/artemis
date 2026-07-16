import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { authConfig } from "@/auth.config";
import { prisma } from "@/lib/db";
import { credentialsSchema } from "@/lib/validators";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Instance complète Auth.js (runtime Node) : Credentials + bcrypt + Prisma.
 * Stratégie JWT (obligatoire avec Credentials) ; le rôle est porté par le token.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async (raw) => {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        // M1 - limitation des tentatives de connexion par e-mail (anti brute-force).
        const rl = rateLimit(
          `login:${parsed.data.email.toLowerCase()}`,
          10,
          15 * 60 * 1000,
        );
        if (!rl.ok) return null;
        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });
        if (!user?.passwordHash) return null;
        const ok = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!ok) return null;
        return {
          id: user.id,
          email: user.email,
          name: user.name ?? undefined,
          role: user.role,
        };
      },
    }),
  ],
});
