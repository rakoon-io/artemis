import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canAccess } from "@/server/access";
import { getWikiPage } from "@/server/services/wiki.service";
import { createWikiAttachment } from "@/server/services/wiki-attachment.service";
import { isDangerousContentType } from "@/lib/attachments";
import { writeLocal } from "@/lib/storage";

const MAX_SIZE = 20 * 1024 * 1024; // 20 Mo

/**
 * PUT /api/wiki-files/upload?key=&filename=&contentType= - réception en
 * STOCKAGE LOCAL (repli quand S3/MinIO n'est pas configuré).
 *
 * Écrit le fichier ET enregistre ses métadonnées en un seul appel. Les contrôles
 * sont identiques à ceux du dépôt S3 suivi de sa confirmation : authentification,
 * accès au projet de la page lue DANS LA CLÉ, types refusés, plafond de taille.
 * Rejouer la liste des types ici n'est pas redondant : c'est la seule barrière si
 * quelqu'un appelle cette route sans passer par la préparation.
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

  // La clé doit désigner une PAGE (`wiki/<pageId>/...`). Le préfixe distinct de
  // celui des tickets interdit qu'une clé forgée d'un espace serve dans l'autre.
  const match = /^wiki\/([^/]+)\//.exec(key);
  if (!match) {
    return NextResponse.json({ error: "Clé invalide." }, { status: 400 });
  }
  if (!filename) {
    return NextResponse.json({ error: "Nom de fichier requis." }, { status: 400 });
  }
  if (isDangerousContentType(contentType)) {
    return NextResponse.json({ error: "Type de fichier refusé." }, { status: 400 });
  }

  const page = await getWikiPage(match[1]);
  if (!page) {
    return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  }
  if (!(await canAccess(user, page.projectId))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  const body = Buffer.from(await request.arrayBuffer());
  if (body.byteLength > MAX_SIZE) {
    return NextResponse.json({ error: "Fichier trop volumineux." }, { status: 413 });
  }

  await writeLocal(key, body);
  const created = await createWikiAttachment({
    pageId: page.id,
    filename,
    contentType,
    size: body.byteLength,
    storageKey: key,
    uploadedById: user.id,
  });
  return NextResponse.json({ id: created.id });
}
