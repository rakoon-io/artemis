import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { presignSchema } from "@/lib/validators";
import {
  attachmentKey,
  isStorageConfigured,
  presignUpload,
} from "@/lib/storage";

/**
 * POST /api/attachments/presign — délivre une URL presignée d'upload (PUT).
 * Le serveur vérifie l'authentification et valide l'entrée AVANT d'émettre l'URL.
 * Si le stockage S3 n'est pas configuré : 501 (le client crée le ticket sans PJ).
 */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Corps de requête invalide." }, { status: 400 });
  }

  const parsed = presignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Stockage non configuré" }, { status: 501 });
  }

  const { filename, contentType, ticketId } = parsed.data;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket requis." }, { status: 400 });
  }

  const key = attachmentKey(ticketId, filename);
  const url = await presignUpload(key, contentType);
  return NextResponse.json({ url, storageKey: key });
}
