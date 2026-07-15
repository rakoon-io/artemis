import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canEditTicket } from "@/lib/policies";
import { getTicketOwnership } from "@/server/services/ticket.service";
import { createAttachment } from "@/server/services/attachment.service";
import { isDangerousContentType } from "@/lib/attachments";
import { writeLocal } from "@/lib/storage";

const MAX_SIZE = 10 * 1024 * 1024; // 10 Mo

/**
 * PUT /api/attachments/upload?key=&filename=&contentType= — réception d'une pièce
 * jointe en **stockage local** (fallback quand S3/MinIO n'est pas configuré).
 *
 * Cette route fait tout en un seul appel : écriture disque **et** enregistrement des
 * métadonnées (pas de round-trip `confirm` séparé). Les contrôles restent identiques
 * à l'upload S3 + confirm : authentification, autorisation via le ticket encodé dans
 * la clé, denylist de types dangereux, plafond de taille. « L'UI masque, le serveur impose. »
 */
export async function PUT(request: Request): Promise<NextResponse> {
  const user = await requireUser().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const params = new URL(request.url).searchParams;
  const key = params.get("key") ?? "";
  const filename = (params.get("filename") ?? "").slice(0, 255);
  const contentType =
    (params.get("contentType") ?? "").slice(0, 120) || "application/octet-stream";

  // La clé doit cibler un ticket (`attachments/<ticketId>/...`) — sinon rejet.
  if (!key.startsWith("attachments/")) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Nom de fichier requis." }, { status: 400 });
  }
  // Défense en profondeur : la denylist est déjà appliquée au presign, on la rejoue ici
  // car un client pourrait appeler cette route directement.
  if (isDangerousContentType(contentType)) {
    return NextResponse.json(
      { error: "Type de fichier non autorisé." },
      { status: 400 },
    );
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
  if (bytes.byteLength === 0) {
    return NextResponse.json({ error: "Fichier vide." }, { status: 400 });
  }
  if (bytes.byteLength > MAX_SIZE) {
    return NextResponse.json(
      { error: "Fichier trop volumineux (10 Mo maximum)." },
      { status: 413 },
    );
  }

  await writeLocal(key, bytes);
  // `size` = octets réellement reçus (fiable, ≤ 10 Mo), pas la valeur annoncée par le client.
  const attachment = await createAttachment({
    ticketId,
    filename,
    contentType,
    size: bytes.byteLength,
    storageKey: key,
    uploadedById: user.id,
  });

  return NextResponse.json({ ok: true, id: attachment.id });
}
