import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getAttachment } from "@/server/services/attachment.service";
import { isStorageConfigured, presignDownload } from "@/lib/storage";

/**
 * GET /api/attachments/[id] — redirige vers une URL presignée de téléchargement.
 * Le serveur vérifie l'authentification et l'existence avant d'émettre l'URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  try {
    await requireUser();
  } catch {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const attachment = await getAttachment(id);
  if (!attachment) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  if (!isStorageConfigured()) {
    return NextResponse.json({ error: "Stockage non configuré." }, { status: 501 });
  }

  const url = await presignDownload(attachment.storageKey);
  // `redirect` lève NEXT_REDIRECT (307) — hors de tout try/catch pour propager.
  redirect(url);
}
