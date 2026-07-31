import type { Role } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: Role;
    } & DefaultSession["user"];
  }
  interface User {
    role?: Role;
    /** Compteur de révocation au moment de la connexion (cf. `sessionEpoch`). */
    sessionEpoch?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: Role;
    /** Valeur du compteur de révocation gravée à la connexion. */
    epoch?: number;
    /** Instant de la dernière relecture en base, pour ne pas la refaire à chaque appel. */
    checkedAt?: number;
  }
}
