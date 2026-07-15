import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canEditTicket } from "@/lib/policies";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { presignSchema } from "@/lib/validators";
import {
  attachmentKey,
  isStorageConfigured,
  presignUpload,
} from "@/lib/storage";

/**
 * Types de contenu refusés à l'upload (risque XSS au rendu inline / téléchargement).
 * Denylist : HTML, SVG, XHTML, et tout type contenant « script ».
 */
const DANGEROUS_CONTENT_TYPES = new Set([
  "text/html",
  "image/svg+xml",
  "application/xhtml+xml",
]);

function isDangerousContentType(contentType: string): boolean {
  const normalized = contentType.trim().toLowerCase();
  const base = normalized.split(";")[0]?.trim() ?? "";
  return DANGEROUS_CONTENT_TYPES.has(base) || normalized.includes("script");
}

/**
 * POST /api/attachments/presign — délivre une URL presignée d'upload (PUT).
 * Le serveur vérifie l'authentification, l'autorisation sur le ticket et valide
 * l'entrée AVANT d'émettre l'URL. La clé S3 est liée au ticket ciblé.
 * Si le stockage S3 n'est pas configuré : 501 (le client crée le ticket sans PJ).
 */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await requireUser().catch(() => null);
  if (!user) {
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

  const { filename, contentType, ticketId } = parsed.data;
  if (!ticketId) {
    return NextResponse.json({ error: "Ticket requis." }, { status: 400 });
  }

  if (isDangerousContentType(contentType)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé." },
      { status: 400 },
    );
  }

  // H1 — l'appelant doit pouvoir éditer le ticket ciblé (reporter, assigné ou admin).
  const ticket = await getTicketOwnership(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  }
  if (!canEditTicket(user, ticket)) {
    return NextResponse.json(
      { error: "Non autorisé sur ce ticket." },
      { status: 403 },
    );
  }

  const key = attachmentKey(ticketId, filename);
  if (isStorageConfigured()) {
    const url = await presignUpload(key, contentType);
    return NextResponse.json({ url, storageKey: key });
  }
  // Fallback local (dev sans MinIO) : upload via notre route dédiée.
  return NextResponse.json({
    url: `/api/attachments/upload?key=${encodeURIComponent(key)}`,
    storageKey: key,
  });
}
