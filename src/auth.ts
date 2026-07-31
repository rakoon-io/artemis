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
/**
 * Condensat de comparaison à vide : bcrypt, coût 12, d'une valeur aléatoire.
 * Il ne correspond à aucun mot de passe utilisable.
 */
const HASH_LEURRE = "$2a$12$C6UzMDM.H6dfI/f/IKcEe.J0Q4nD8yqcAdU8ZH2mS/tSN3o8kY5aq";

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
        /**
         * ON VÉRIFIE TOUJOURS UN CONDENSAT, même quand le compte n'existe pas.
         *
         * Les réponses étaient déjà identiques, mais pas les DÉLAIS : une adresse
         * inconnue repartait après une seule requête indexée, une adresse connue
         * après un bcrypt de coût 12 en JavaScript pur - des centaines de
         * millisecondes. L'écart se mesure au chronomètre et énumère les comptes.
         *
         * Le condensat de repli est celui d'un mot de passe qu'on ne connaît pas
         * et qui n'ouvre rien ; seul son coût nous intéresse.
         */
        const ok = await bcrypt.compare(
          parsed.data.password,
          user?.passwordHash ?? HASH_LEURRE,
        );
        if (!user?.passwordHash || !ok) return null;
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
