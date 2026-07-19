import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { getDictionary } from "@/i18n/server";
import { fmt } from "@/i18n";
import { isAdmin } from "@/lib/policies";
import {
  getBoardData,
  getLabels,
  getProjectByKey,
  getProjectMembersView,
  getTicketPriorities,
  getTicketTypes,
} from "@/server/queries";
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
import { PriorityManager } from "@/components/settings/priority-manager";
import { MemberManager } from "@/components/settings/member-manager";
import { ProjectSettingsForm } from "@/components/settings/project-settings-form";
import { TypeManager } from "@/components/settings/type-manager";

/**
 * Paramètres du projet (RSC) : personnalisation du workflow (colonnes) et des
 * labels. Réservé aux administrateurs - un non-admin voit un message d'accès
 * refusé (l'onglet est de toute façon masqué en amont).
 */
export default async function SettingsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const session = await auth();
  const t = await getDictionary();

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>{t.settings.adminOnlyTitle}</CardTitle>
            <CardDescription>
              {t.settings.adminOnlyDescription}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const project = await getProjectByKey(key);
  if (!project) notFound();

  const [{ columns }, labels, membersView, types, priorities] =
    await Promise.all([
      getBoardData(project.id),
      getLabels(project.id),
      getProjectMembersView(project.id),
      getTicketTypes(project.id),
      getTicketPriorities(project.id),
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
          {fmt(t.settings.pageTitle, { name: project.name })}
        </h1>
        <p className="text-sm text-muted-foreground">
          {t.settings.pageSubtitle}
        </p>
      </div>

      <Tabs defaultValue="project">
        <TabsList>
          <TabsTrigger value="project">{t.settings.tabs.project}</TabsTrigger>
          <TabsTrigger value="columns">{t.settings.tabs.columns}</TabsTrigger>
          <TabsTrigger value="labels">{t.settings.tabs.labels}</TabsTrigger>
          <TabsTrigger value="types">{t.settings.tabs.types}</TabsTrigger>
          <TabsTrigger value="priorities">
            {t.settings.tabs.priorities}
          </TabsTrigger>
          <TabsTrigger value="members">{t.settings.tabs.members}</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.projectCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.projectCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProjectSettingsForm
                project={{
                  id: project.id,
                  name: project.name,
                  description: project.description,
                  accentColor: project.accentColor,
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="columns" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.columnsCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.columnsCardDescription}
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
              <CardTitle>{t.settings.labelsCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.labelsCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <LabelManager labels={labels} projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.typesCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.typesCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <TypeManager types={types} projectId={project.id} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="priorities" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.prioritiesCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.prioritiesCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PriorityManager
                priorities={priorities}
                projectId={project.id}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="members" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>{t.settings.membersCardTitle}</CardTitle>
              <CardDescription>
                {t.settings.membersCardDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MemberManager projectId={project.id} users={membersView} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
