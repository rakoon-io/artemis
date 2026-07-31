import Link from "next/link";
import { ArrowLeft, BookLock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WikiContent } from "@/components/wiki/wiki-content";
import { PageOutline } from "@/components/wiki/page-outline";
import { anchorFor } from "@/lib/markdown-outline";
import { formatDateTime } from "@/lib/utils";
import { formatVersionLabel } from "@/lib/spec-package";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";

/**
 * Lecture d'une VERSION PUBLIÉE d'un paquet de spécifications (composant serveur).
 *
 * Le document est rendu D'UN SEUL TENANT, dans l'ordre de lecture figé à la
 * publication, et non page par page dans l'arborescence. C'est le propre d'une
 * version : elle n'est plus une collection de pages qu'on navigue, mais un
 * document qu'on lit - et qu'on peut relire à l'identique dans six mois.
 *
 * L'arborescence du wiki n'est volontairement PAS affichée ici : elle montre
 * l'état actuel, qui n'a aucune raison de correspondre à celui de l'instantané.
 * Les chemins conservés dans chaque instantané tiennent ce rôle.
 *
 * Aucune commande d'édition : une version publiée est immuable.
 */
export async function SpecVersionView({
  version,
  projectKey,
  ticketMap,
}: {
  version: {
    number: number;
    label: string | null;
    note: string | null;
    createdAt: Date | string;
    publishedBy: { name: string | null; email: string } | null;
    package: { rootPage: { title: string }; rootPageId: string };
    pages: Array<{
      id: string;
      title: string;
      content: string;
      path: string;
    }>;
  };
  projectKey: string;
  /** Résolution des citations « RKN-123 » : l'état actuel des tickets. */
  ticketMap: Record<string, string>;
}) {
  const t = await getDictionary();
  const label = formatVersionLabel(version.number, version.label);
  const author =
    version.publishedBy?.name ?? version.publishedBy?.email ?? null;

  // Un parcours unique et ordonné, comme pour un document Markdown : deux pages
  // du même titre reçoivent ainsi des ancres distinctes.
  const seen = new Map<string, number>();
  const outline = version.pages.map((page, index) => ({
    level: 2,
    title: page.title,
    anchor: anchorFor(page.title, seen),
    depth: index === 0 ? 0 : 1,
    line: index + 1,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="flex flex-wrap items-center gap-2">
            <BookLock className="size-4 text-muted-foreground" aria-hidden />
            <span className="text-sm text-muted-foreground">
              {t.wiki.specs.badge}
            </span>
            <Badge variant="secondary">{label}</Badge>
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {version.package.rootPage.title}
          </h1>
          <p className="text-xs text-muted-foreground">
            {fmt(t.wiki.specs.frozenNotice, {
              date: formatDateTime(version.createdAt),
            })}
            {author
              ? ` — ${fmt(t.wiki.specs.publishedBy, { name: author })}`
              : ""}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link
            href={`/projects/${projectKey}/wiki?page=${version.package.rootPageId}`}
          >
            <ArrowLeft />
            {t.wiki.specs.backToWorking}
          </Link>
        </Button>
      </div>

      {version.note && (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          {version.note}
        </p>
      )}

      {/* Une version publiée est un document d'un seul tenant, souvent long :
          son sommaire liste ses PAGES, là où celui d'une page ordinaire liste
          ses titres. Les ancres sont posées par la même fonction, si bien que
          les liens aboutissent ici comme ailleurs. */}
      <PageOutline headings={outline} />

      <div className="space-y-8">
        {version.pages.map((page, index) => (
          <section key={page.id} id={outline[index]?.anchor} className="scroll-mt-20 space-y-2">
            {/* Le chemin est rappelé sous le titre pour les chapitres, pas pour
                la première page : c'est la racine, son chemin est son titre. */}
            <div className="space-y-0.5 border-b pb-2">
              <h2 className="text-lg font-semibold tracking-tight">
                {page.title}
              </h2>
              {index > 0 && (
                <p className="font-mono text-xs text-muted-foreground">
                  {page.path}
                </p>
              )}
            </div>
            {page.content.trim() ? (
              <WikiContent
                content={page.content}
                projectKey={projectKey}
                ticketMap={ticketMap}
              />
            ) : (
              <p className="text-sm italic text-muted-foreground">
                {t.wiki.form.nothingToPreview}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  );
}
