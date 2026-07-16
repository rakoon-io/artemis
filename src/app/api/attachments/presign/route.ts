import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canEditTicket } from "@/lib/policies";
import { canAccess } from "@/server/access";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { presignSchema } from "@/lib/validators";
import { isDangerousContentType } from "@/lib/attachments";
import {
  attachmentKey,
  isStorageConfigured,
  presignUpload,
} from "@/lib/storage";

/**
 * POST /api/attachments/presign - prépare l'upload d'une pièce jointe.
 * Le serveur vérifie l'authentification, l'autorisation sur le ticket et valide
 * l'entrée AVANT d'émettre l'URL. La clé de stockage est liée au ticket ciblé.
 *
 * Réponse : `{ url, storageKey, mode }`.
 * - `mode: "s3"`   → PUT direct vers S3 (URL presignée), puis `confirmAttachmentAction`.
 * - `mode: "local"`→ PUT vers notre route `/api/attachments/upload`, qui **enregistre
 *   elle-même** la pièce jointe (pas de round-trip `confirm`). filename/contentType
 *   sont encodés dans l'URL pour éviter un aller-retour supplémentaire.
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

  // H1 - l'appelant doit pouvoir éditer le ticket ciblé (reporter, assigné ou admin).
  const ticket = await getTicketOwnership(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  }
  // Accès au projet requis (membre ou admin), en plus des droits d'édition du ticket.
  if (!(await canAccess(user, ticket.projectId)) || !canEditTicket(user, ticket)) {
    return NextResponse.json(
      { error: "Non autorisé sur ce ticket." },
      { status: 403 },
    );
  }

  const key = attachmentKey(ticketId, filename);
  if (isStorageConfigured()) {
    const url = await presignUpload(key, contentType);
    return NextResponse.json({ url, storageKey: key, mode: "s3" });
  }
  // Fallback local (dev sans MinIO) : upload + enregistrement via notre route dédiée.
  // filename/contentType voyagent dans l'URL ; la route les revalide (défense en profondeur).
  const params = new URLSearchParams({ key, filename, contentType });
  return NextResponse.json({
    url: `/api/attachments/upload?${params.toString()}`,
    storageKey: key,
    mode: "local",
  });
}
