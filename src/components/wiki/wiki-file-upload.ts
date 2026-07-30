"use client";

import { confirmWikiAttachmentAction } from "@/server/actions/wiki-attachment.actions";

/**
 * Dépôt d'un fichier sur une PAGE DE WIKI : préparation → PUT → (S3 :
 * confirmation ; local : la route d'upload enregistre elle-même).
 *
 * Logique partagée par le collage d'image dans l'éditeur et par la liste des
 * pièces jointes, pour que les deux chemins ne puissent pas diverger sur les
 * contrôles.
 */

export interface UploadedFile {
  id: string;
  filename: string;
  contentType: string;
}

/**
 * ADRESSE STABLE d'une pièce jointe, celle que l'on écrit dans le Markdown.
 *
 * Jamais l'URL signée : elle expire en quelques minutes, et une page qui la
 * porterait afficherait des images cassées pour toujours. Cette adresse-ci ne
 * périme pas - c'est l'application qui signe, à chaque lecture.
 */
export function wikiFileHref(id: string): string {
  return `/api/wiki-files/${id}`;
}

/** Markdown d'insertion : image en ligne pour une image, lien sinon. */
export function wikiFileMarkdown(file: UploadedFile): string {
  const href = wikiFileHref(file.id);
  return file.contentType.startsWith("image/")
    ? `![${file.filename}](${href})`
    : `[${file.filename}](${href})`;
}

/** Fichiers image d'un presse-papier ou d'un glisser-déposer. */
export function collectImages(data: DataTransfer): File[] {
  const images: File[] = [];
  for (const file of Array.from(data.files)) {
    if (file.type.startsWith("image/")) images.push(file);
  }
  if (images.length === 0) {
    // Certaines applications ne remplissent que `items` (capture d'écran collée
    // depuis le système, image copiée depuis un navigateur).
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
 * Téléverse un fichier et renvoie de quoi le citer. `null` en cas d'échec :
 * l'appelant décide quoi dire, et n'insère rien dans le texte.
 */
export async function uploadWikiFile(
  pageId: string,
  file: File,
): Promise<UploadedFile | null> {
  const presign = await fetch("/api/wiki-files/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pageId,
      filename: file.name || "fichier",
      contentType: file.type || "application/octet-stream",
    }),
  });
  if (!presign.ok) return null;
  const { url, storageKey, mode } = (await presign.json()) as {
    url: string;
    storageKey: string;
    mode: "s3" | "local";
  };

  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!put.ok) return null;

  const filename = file.name || "fichier";
  const contentType = file.type || "application/octet-stream";

  if (mode === "local") {
    // La route locale a déjà tout enregistré : elle rend l'identifiant.
    const { id } = (await put.json()) as { id: string };
    return { id, filename, contentType };
  }

  const res = await confirmWikiAttachmentAction({
    pageId,
    filename,
    contentType,
    size: file.size,
    storageKey,
  });
  if (!res.ok || !res.data) return null;
  return { id: res.data.id, filename, contentType };
}
