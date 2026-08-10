import { contentDisposition, safeServing } from "@/lib/attachments";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canAccess } from "@/server/access";
import { getWikiAttachmentWithProject } from "@/server/services/wiki-attachment.service";
import { readStored } from "@/lib/storage";

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


  // Repli disque : l'application sert les octets depuis sa propre origine, donc
  // elle décide seule de ce qui s'affiche en place (cf. `safeServing`) - jamais
  // la chaîne de type choisie au dépôt.
  try {
    const buffer = await readStored(file.storageKey);
    const { type, disposition } = safeServing(file.contentType);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": type,
        "Content-Disposition": contentDisposition(disposition, file.filename),
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fichier introuvable." }, { status: 404 });
  }
}
