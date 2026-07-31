import type { NextAuthConfig } from "next-auth";
import type { Role } from "@prisma/client";

/**
 * Config Auth.js « edge-safe » (sans Prisma ni bcrypt) - utilisée par le middleware.
 * La logique de connexion (Credentials + bcrypt + Prisma) vit dans `src/auth.ts`.
 */
export const authConfig = {
  pages: { signIn: "/login" },
  /**
   * DURÉE DE SESSION EXPLICITE.
   *
   * Rien n'était déclaré, donc le défaut d'Auth.js s'appliquait : trente jours,
   * prolongés à chaque visite. Comme le rôle voyage dans le jeton et n'était
   * jamais relu (voir `jwt` ci-dessous), un administrateur révoqué le restait
   * un mois. Huit heures couvrent une journée de travail ; au-delà, on se
   * reconnecte, et la révocation prend effet.
   */
  session: { strategy: "jwt", maxAge: 8 * 60 * 60, updateAge: 60 * 60 },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const path = nextUrl.pathname;
      // Pages publiques (jeton de première connexion, demande de réinitialisation).
      if (path === "/activer" || path === "/reset") return true;
      // Repli hors ligne : le service worker le met en réserve à l'installation,
      // souvent AVANT toute connexion. Protégé, il aurait mis en cache une
      // redirection vers /login - et l'aurait servie à la place, indéfiniment.
      if (path === "/hors-ligne") return true;
      const isAuthRoute = path === "/login" || path === "/register";
      if (isAuthRoute) {
        if (isLoggedIn) return Response.redirect(new URL("/", nextUrl));
        return true;
      }
      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = (token.id as string) ?? session.user.id;
        session.user.role = token.role as Role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
