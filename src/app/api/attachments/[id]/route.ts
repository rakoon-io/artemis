import { contentDisposition, safeServing } from "@/lib/attachments";
import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canAccess } from "@/server/access";
import { getAttachmentWithProject } from "@/server/services/attachment.service";
import { isStorageConfigured, presignDownload, readLocal } from "@/lib/storage";

/**
 * GET /api/attachments/[id] - sert la pièce jointe.
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

  const attachment = await getAttachmentWithProject(id);
  if (!attachment) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }
  // L'utilisateur doit avoir accès au projet du ticket porteur (membre ou admin).
  if (!(await canAccess(user, attachment.ticket.projectId))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  if (isStorageConfigured()) {
    const url = await presignDownload(attachment.storageKey);
    // `redirect` lève NEXT_REDIRECT (307) - hors de tout try/catch pour propager.
    redirect(url);
  }

  /**
   * Repli local : c'est l'APPLICATION qui sert les octets, depuis sa propre
   * origine. Ce que le navigateur en fait ne peut donc pas dépendre d'une chaîne
   * choisie par le téléverseur : seules les images matricielles et les PDF
   * s'affichent en place, tout le reste se télécharge (cf. `safeServing`).
   *
   * Le commentaire d'origine se fiait au refus à l'entrée - « types dangereux
   * déjà refusés à l'upload ». C'était vrai de quatre voies d'écriture sur cinq.
   */
  try {
    const buffer = await readLocal(attachment.storageKey);
    const { type, disposition } = safeServing(attachment.contentType);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": contentDisposition(disposition, attachment.filename),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
