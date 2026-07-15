import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canEditTicket } from "@/lib/policies";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { writeLocal } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

/**
 * PUT /api/attachments/upload?key=... — réception d'une pièce jointe en **stockage local**
 * (fallback quand S3/MinIO n'est pas configuré). L'autorisation est vérifiée via le ticket
 * encodé dans la clé (`attachments/<ticketId>/...`). Même politique que l'upload S3 presigné.
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const key = new URL(request.url).searchParams.get("key") ?? "";
  if (!key.startsWith("attachments/")) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }

  const ticketId = key.split("/")[1] ?? "";
  const ticket = await getTicketOwnership(ticketId);
  if (!ticket) {
    return NextResponse.json({ error: "Ticket introuvable." }, { status: 404 });
  }
  if (!canEditTicket(user, ticket)) {
    return NextResponse.json({ error: "Non autorisé sur ce ticket." }, { status: 403 });
  }

  const bytes = new Uint8Array(await request.arrayBuffer());
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (10 Mo maximum)." },
      { status: 413 },
    );
  }

  await writeLocal(key, bytes);
  return NextResponse.json({ ok: true });
}
