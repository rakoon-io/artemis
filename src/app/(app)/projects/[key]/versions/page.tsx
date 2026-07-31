import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReleaseState } from "@prisma/client";
import { auth } from "@/auth";
import { getAccessibleProjectByKey } from "@/server/access";
import { getColumns, getReleasesWithTickets } from "@/server/queries";
import { Badge } from "@/components/ui/badge";
import { CreateReleaseDialog } from "@/components/release/create-release-dialog";
import { ReleaseCard } from "@/components/release/release-card";
import { getDictionary } from "@/i18n/server";

export const metadata: Metadata = { title: "Versions" };

/**
 * VERSIONS du projet - ce qu'on livre, et quand.
 *
 * Deux sections, dans l'ordre où l'on s'en occupe : ce qui reste à livrer, puis
 * ce qui l'a été. Le livré ne disparaît pas - c'est l'historique du produit, et
 * la seule façon de savoir dans quelle version tel correctif est sorti.
 */
export default async function VersionsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const t = await getDictionary();

  const session = await auth();
  const project = await getAccessibleProjectByKey(session?.user, key);
  if (!project) notFound();

  const [releases, columns] = await Promise.all([
    getReleasesWithTickets(project.id),
    getColumns(project.id),
  ]);

  /**
   * Rang de la DERNIÈRE colonne : c'est lui qui dit ce qui est achevé. Un
   * projet peut renommer ses colonnes ou en ajouter ; se fier au nom
   * « Terminé » aurait cassé au premier projet en anglais.
   */
  const lastColumnOrder = columns.length
    ? Math.max(...columns.map((column) => column.order))
    : Number.MAX_SAFE_INTEGER;

  const planned = releases.filter((r) => r.state === ReleaseState.PLANNED);
  const shipped = releases.filter((r) => r.state === ReleaseState.RELEASED);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.releases.title}
          </h1>
          <p className="max-w-prose text-sm text-muted-foreground">
            {t.releases.subtitle}
          </p>
        </div>
        <CreateReleaseDialog projectId={project.id} />
      </div>

      {releases.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
          {t.releases.empty}
        </div>
      ) : (
        <div className="space-y-8">
          {[
            { items: planned, label: t.releases.planned },
            { items: shipped, label: t.releases.released },
          ].map(({ items, label }) =>
            items.length === 0 ? null : (
              <section key={label} className="space-y-3">
                <div className="flex items-center gap-2">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    {label}
                  </h2>
                  <Badge variant="outline">{items.length}</Badge>
                </div>
                <div className="grid gap-4 2xl:grid-cols-2">
                  {items.map((release) => (
                    <ReleaseCard
                      key={release.id}
                      release={release}
                      projectKey={project.key}
                      lastColumnOrder={lastColumnOrder}
                      late={release.late}
                    />
                  ))}
                </div>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
