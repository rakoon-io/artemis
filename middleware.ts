import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";
import { nouveauNonce, politiqueImposee, politiqueObservee } from "@/lib/csp";

/**
 * Middleware « edge-safe ». Il fait DEUX choses.
 *
 * 1. Il protège les routes (Auth.js, cf. `authorized` dans `auth.config.ts`) ;
 * 2. il tire le jeton de la politique de sécurité du contenu.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * POURQUOI LE JETON SE POSE ICI, ET NULLE PART AILLEURS
 *
 * Il doit atteindre DEUX destinataires à partir d'un seul tirage :
 *
 * - le NAVIGATEUR, par l'en-tête de réponse, pour qu'il sache quels scripts
 *   accepter ;
 * - le RENDU, par les en-têtes de REQUÊTE, parce que c'est Next qui écrit les
 *   scripts en ligne du flux RSC et qui doit les marquer. Next lit pour cela
 *   l'en-tête `Content-Security-Policy` de la REQUÊTE et en extrait le jeton -
 *   d'où sa présence des deux côtés, qui surprend à la lecture.
 *
 * Le middleware est le seul endroit traversé par les deux.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * CE QUE LE FILTRE LAISSE PASSER
 *
 * Le `matcher` écarte `/api`, les fragments statiques et les images : ces
 * réponses-là n'ont pas de script en ligne, donc pas besoin de jeton. Elles
 * reçoivent la politique SANS jeton, posée par `next.config.ts`, qui reste le
 * plancher commun.
 */
const { auth } = NextAuth(authConfig);

export default auth((requete) => {
  const nonce = nouveauNonce();
  const imposee = politiqueImposee(nonce);

  // Vers le RENDU : Next y lit le jeton pour marquer ses propres scripts.
  const enTetesRequete = new Headers(requete.headers);
  enTetesRequete.set("x-nonce", nonce);
  enTetesRequete.set("Content-Security-Policy", imposee);

  const reponse = NextResponse.next({ request: { headers: enTetesRequete } });

  // Vers le NAVIGATEUR : c'est cet en-tête-là qui fait foi.
  reponse.headers.set("Content-Security-Policy", imposee);
  reponse.headers.set(
    "Content-Security-Policy-Report-Only",
    politiqueObservee(nonce),
  );
  return reponse;
});

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpe?g|gif|webp|avif|ico)$).*)",
  ],
};
