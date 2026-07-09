import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

// Middleware « edge-safe » : protège toutes les routes sauf les publiques ci-dessous.
export default NextAuth(authConfig).auth;

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.svg$).*)"],
};
