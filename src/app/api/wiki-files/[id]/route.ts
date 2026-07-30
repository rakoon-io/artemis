import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { canAccess } from "@/server/access";
import { getWikiAttachmentWithProject } from "@/server/services/wiki-attachment.service";
import { isStorageConfigured, presignDownload, readLocal } from "@/lib/storage";

/**
 * GET /api/wiki-files/[id] - sert une pièce jointe de page de wiki.
 *
 * ADRESSE STABLE, et c'est tout l'intérêt : c'est elle que le Markdown d'une
 * page porte pour ses images (« ![](/api/wiki-files/<id>) »). Elle ne périme
 * jamais. L'URL signée, elle, est fabriquée à chaque appel et ne vit que
 * quelques minutes - écrite dans le texte, elle aurait cassé les images de la
 * page pour de bon.
 *
 * Authentification et accès au projet exigés dans les deux modes de stockage.
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

  const file = await getWikiAttachmentWithProject(id);
  if (!file) {
    return NextResponse.json({ error: "Pièce jointe introuvable." }, { status: 404 });
  }
  if (!(await canAccess(user, file.page.projectId))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }

  if (isStorageConfigured()) {
    const url = await presignDownload(file.storageKey);
    // `redirect` lève NEXT_REDIRECT (307) - hors de tout try/catch pour propager.
    redirect(url);
  }

  // Repli disque (les types dangereux sont refusés au dépôt → `inline` sûr).
  try {
    const buffer = await readLocal(file.storageKey);
    const safeName = file.filename.replace(/["\r\n]/g, "");
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": file.contentType || "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
