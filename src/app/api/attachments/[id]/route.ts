import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getAttachment } from "@/server/services/attachment.service";
import { isStorageConfigured, presignDownload, readLocal } from "@/lib/storage";

/**
 * GET /api/attachments/[id] — sert la pièce jointe.
 * - S3 : redirection vers une URL presignée à durée limitée.
 * - Local (fallback) : lecture disque + streaming.
 * Authentification requise dans les deux cas.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await params;

  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const attachment = await getAttachment(id);
  if (!attachment) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }

  if (isStorageConfigured()) {
    const url = await presignDownload(attachment.storageKey);
    // `redirect` lève NEXT_REDIRECT (307) — hors de tout try/catch pour propager.
    redirect(url);
  }

  // Fallback local (types dangereux déjà refusés à l'upload → `inline` sûr).
  try {
    const buffer = await readLocal(attachment.storageKey);
    const safeName = attachment.filename.replace(/["\r\n]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": attachment.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
