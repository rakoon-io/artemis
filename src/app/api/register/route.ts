import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma, Role } from "@prisma/client";
import { prisma } from "@/lib/db";
import { registerSchema } from "@/lib/validators";

/**
 * Inscription (POST) : valide, refuse un e-mail déjà pris (409), hache le mot de
 * passe. Le tout premier utilisateur créé devient ADMIN, les suivants REPORTER.
 */
export async function POST(request: Request): Promise<NextResponse> {
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

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { ok: false, error: "Cet e-mail est déjà utilisé." },
      { status: 409 },
    );
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const isFirstUser = (await prisma.user.count()) === 0;
  const role = isFirstUser ? Role.ADMIN : Role.REPORTER;

  try {
    await prisma.user.create({
      data: { name, email, passwordHash, role },
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
