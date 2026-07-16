import { notFound } from "next/navigation";

import { auth } from "@/auth";
import { isAdmin } from "@/lib/policies";
import {
  getBoardData,
  getLabels,
  getMembers,
  getProjectByKey,
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
import { ProjectSettingsForm } from "@/components/settings/project-settings-form";
import { TypeManager } from "@/components/settings/type-manager";
import { UserManager } from "@/components/settings/user-manager";

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

  if (!session?.user || !isAdmin(session.user)) {
    return (
      <div className="mx-auto max-w-2xl">
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

  const [{ columns }, labels, members, types, priorities] = await Promise.all([
    getBoardData(project.id),
    getLabels(project.id),
    getMembers(),
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
          {project.name} - Paramètres
        </h1>
        <p className="text-sm text-muted-foreground">
          Éditez le projet, personnalisez le workflow (colonnes, labels) et gérez
          les utilisateurs.
        </p>
      </div>

      <Tabs defaultValue="project">
        <TabsList>
          <TabsTrigger value="project">Projet</TabsTrigger>
          <TabsTrigger value="columns">Colonnes</TabsTrigger>
          <TabsTrigger value="labels">Labels</TabsTrigger>
          <TabsTrigger value="types">Types</TabsTrigger>
          <TabsTrigger value="priorities">Priorités</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
        </TabsList>

        <TabsContent value="project" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Projet</CardTitle>
              <CardDescription>
                Modifiez le nom et la description du projet.
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

        <TabsContent value="types" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Types de ticket</CardTitle>
              <CardDescription>
                Définissez les types de ticket (nom + couleur), réordonnez-les ou
                supprimez ceux qui ne servent plus.
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
              <CardTitle>Priorités</CardTitle>
              <CardDescription>
                Définissez les priorités (nom + couleur), réordonnez-les ou
                supprimez celles qui ne servent plus.
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

        <TabsContent value="users" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Utilisateurs &amp; rôles</CardTitle>
              <CardDescription>
                Ajoutez des comptes, changez les rôles (Administrateur /
                Rapporteur) ou supprimez des utilisateurs.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <UserManager users={members} currentUserId={session.user.id} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
