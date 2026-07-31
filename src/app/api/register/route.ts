import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { registerSchema } from "@/lib/validators";
import { rateLimit, clientIp } from "@/lib/rate-limit";

/**
 * Inscription (POST) : valide, refuse un e-mail déjà pris (409), hache le mot de
 * passe. Le tout premier utilisateur créé devient ADMIN, les suivants REPORTER.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // M1 - limitation de débit par IP (anti abus / création de comptes en masse).
  const rl = rateLimit(`register:${clientIp(request.headers)}`, 10, 10 * 60 * 1000);
  if (!rl.ok) {
    return NextResponse.json(
      { ok: false, error: "Trop de tentatives. Réessayez plus tard." },
      { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Requête invalide." },
      { status: 400 },
    );
  }

  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        ok: false,
        error: parsed.error.issues[0]?.message ?? "Données invalides.",
      },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;

  // C1 - Inscription restreinte à une liste blanche de domaines (si configurée).
  // Variable absente ⇒ comportement inchangé (dev).
  const allowedDomains = env.ALLOWED_EMAIL_DOMAINS?.split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  if (allowedDomains && allowedDomains.length > 0) {
    const domain = email.split("@")[1]?.toLowerCase() ?? "";
    if (!allowedDomains.includes(domain)) {
      return NextResponse.json(
        { ok: false, error: "Inscription non autorisée pour ce domaine." },
        { status: 403 },
      );
    }
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Cet e-mail est déjà utilisé." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);

  /**
   * TOUJOURS Rapporteur. Cette route accordait le rôle Administrateur au
   * PREMIER inscrit, en se fiant à `user.count() === 0`.
   *
   * Elle est publique et non authentifiée. Toute fenêtre où la table des
   * utilisateurs est vide - déploiement neuf, migration vers une nouvelle base,
   * réinitialisation de la démo - offrait donc l'administration à qui postait le
   * premier. Le décompte et la création n'étant pas atomiques, deux inscriptions
   * simultanées pouvaient même l'obtenir toutes les deux.
   *
   * Le premier administrateur se crée par l'amorçage ou en ligne de commande,
   * jamais par un formulaire ouvert sur l'Internet.
   */
  try {
    await prisma.user.create({
      data: { name, email, passwordHash, role: Role.REPORTER },
    });
  } catch (error) {
    // Course sur la contrainte d'unicité de l'e-mail.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        { ok: false, error: "Cet e-mail est déjà utilisé." },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { ok: false, error: "Impossible de créer le compte." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
