"use client";

import { toast } from "sonner";

/**
 * Logique partagée d'ajout de pièces jointes (dialogues de création ET d'édition).
 * Centralise la capture d'images du presse-papier et le téléversement
 * (demande d'adresse → PUT vers l'application), pour éviter toute divergence de sécurité.
 */

export type PendingKind = "image" | "file" | "text";

export interface PendingAttachment {
  id: string;
  file: File;
  kind: PendingKind;
  previewUrl?: string;
}

/** Récupère les fichiers image d'un presse-papier / drag (via `files` puis `items`). */
export function collectImages(data: DataTransfer): File[] {
  const images: File[] = [];
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) images.push(file);
  }
  if (images.length === 0) {
    for (const item of Array.from(data.items)) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) images.push(file);
      }
    }
  }
  return images;
}

/**
 * Téléverse un fichier sur un ticket : demande d'adresse, puis PUT vers la route
 * de dépôt de l'application, qui écrit dans le stockage ET crée la pièce jointe.
 * Renvoie `true` si la pièce jointe est bien créée.
 */
export async function uploadFileToTicket(
  ticketId: string,
  file: File,
): Promise<boolean> {
  const contentType = file.type || "application/octet-stream";

  let presignRes: Response;
  try {
    presignRes = await fetch("/api/attachments/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ticketId,
        filename: file.name,
        contentType,
        size: file.size,
      }),
    });
  } catch {
    return false;
  }
  if (!presignRes.ok) return false;

  const { url } = (await presignRes.json()) as { url: string };

  try {
    const put = await fetch(url, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
    if (!put.ok) return false;
  } catch {
    return false;
  }

  // La route de dépôt a créé la pièce jointe : rien à confirmer.
  return true;
}

/** Téléverse plusieurs fichiers **en parallèle** ; signale chaque échec sans bloquer les autres. */
export async function uploadFilesToTicket(
  ticketId: string,
  files: File[],
): Promise<void> {
  await Promise.all(
    files.map((file) =>
      uploadFileToTicket(ticketId, file).then((ok) => {
        if (!ok) toast.error(`Échec de l'envoi de « ${file.name} ».`);
      }),
    ),
  );
}
