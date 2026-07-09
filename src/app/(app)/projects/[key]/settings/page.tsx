import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import { getBoardData, getLabels, getProjectByKey } from "@/server/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ColumnManager } from "@/components/settings/column-manager";
import { LabelManager } from "@/components/settings/label-manager";

/**
 * Paramètres du projet (RSC) : personnalisation du workflow (colonnes) et des
 * labels. Réservé aux administrateurs — un non-admin voit un message d'accès
 * refusé (l'onglet est de toute façon masqué en amont).
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = await auth();

  if (!isAdmin(session?.user)) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Accès réservé aux administrateurs</CardTitle>
            <CardDescription>
              Les paramètres du projet ne sont accessibles qu&apos;aux
              administrateurs.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [{ columns }, labels] = await Promise.all([
    getBoardData(project.id),
    getLabels(project.id),
  ]);

  const columnSummaries = columns.map((column) => ({
    id: column.id,
    name: column.name,
    wipLimit: column.wipLimit,
    ticketCount: column.tickets.length,
  }));

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="space-y-1">
        <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
        <h1 className="text-2xl font-semibold tracking-tight">
          {project.name} — Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Personnalisez le workflow (colonnes du tableau) et les labels du
          projet.
        </p>
      </div>

      <Tabs defaultValue="columns">
        <TabsList>
          <TabsTrigger value="columns">Colonnes</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
        </TabsList>

        <TabsContent value="columns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Colonnes du workflow</CardTitle>
              <CardDescription>
                Réordonnez, renommez, limitez l&apos;en-cours (WIP) ou supprimez
                les colonnes du tableau Kanban.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ColumnManager columns={columnSummaries} projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="labels" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Labels</CardTitle>
              <CardDescription>
                Créez des labels colorés pour catégoriser les tickets, ou
                supprimez ceux qui ne servent plus.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabelManager labels={labels} projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
