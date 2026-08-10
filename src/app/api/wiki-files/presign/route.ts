import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { canAccess } from "@/server/access";
import { getWikiPage } from "@/server/services/wiki.service";
import { wikiPresignSchema } from "@/lib/validators";
import { isDangerousContentType } from "@/lib/attachments";
import { wikiFileKey } from "@/lib/storage";

/**
 * POST /api/wiki-files/presign - prépare le dépôt d'une pièce jointe de page.
 *
 * Le serveur vérifie l'authentification, l'accès au projet et le type AVANT
 * d'émettre quoi que ce soit ; la clé de stockage est dérivée de la page ciblée,
 * jamais reçue du client. « L'UI masque, le serveur impose. »
 *
 * Réponse : `{ url, storageKey, mode }`.
 *  - `mode: "proxy"` → PUT vers la route de dépôt de l'application ;
 *  - `mode: "proxy"` → PUT vers `/api/wiki-files/upload`, qui enregistre tout
 *    d'un coup (pas d'aller-retour de confirmation).
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

  const parsed = wikiPresignSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Données invalides." },
      { status: 400 },
    );
  }
  const { pageId, filename, contentType } = parsed.data;

  const page = await getWikiPage(pageId);
  if (!page) {
    return NextResponse.json({ error: "Page introuvable." }, { status: 404 });
  }
  if (!(await canAccess(user, page.projectId))) {
    return NextResponse.json({ error: "Non autorisé." }, { status: 403 });
  }
  if (isDangerousContentType(contentType)) {
    return NextResponse.json({ error: "Type de fichier refusé." }, { status: 400 });
  }

  const storageKey = wikiFileKey(pageId, filename);
  const params = new URLSearchParams({ key: storageKey, filename, contentType });
  return NextResponse.json({
    url: `/api/wiki-files/upload?${params.toString()}`,
    storageKey,
    mode: "proxy",
  });
}
