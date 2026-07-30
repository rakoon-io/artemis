import { notFound } from "next/navigation";

import { currentUser } from "@/lib/session";
import { can, isAdmin } from "@/lib/policies";
import { getAccessibleProjectByKey } from "@/server/access";
import {
  getComponents,
  getDocumentationIndex,
  getModules,
  getProposedComponents,
  getProposedModules,
} from "@/server/queries";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ComponentBadge,
  ModuleBadge,
} from "@/components/ticket/ticket-fields";
import {
  ProposeComponentDialog,
  ProposeModuleDialog,
} from "@/components/structure/propose-dialogs";
import {
  ProposalQueue,
  type PendingProposal,
} from "@/components/structure/proposal-queue";
import { DocumentingPages } from "@/components/wiki/documenting-pages";
import { getDictionary } from "@/i18n/server";

/**
 * Page STRUCTURE d'un projet (RSC) : les modules et composants **en lecture**,
 * ouverts à tout membre du projet - rapporteurs compris.
 *
 * Répartition avec les Paramètres, volontaire :
 *  - ici, on CONSULTE la structure et l'on PROPOSE des ajouts (tout le monde) ;
 *  - dans Paramètres, on la CONFIGURE : renommer, colorer, réordonner, supprimer
 *    (administrateurs seulement).
 * Un rapporteur n'a donc jamais accès aux réglages du projet pour autant.
 *
 * L'administrateur voit en plus la file des propositions à valider ou refuser.
 */
export default async function StructurePage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const t = await getDictionary();
  const user = await currentUser();
  const project = await getAccessibleProjectByKey(user, key);
  if (!project) notFound();

  const admin = isAdmin(user);
  const canReview = can(user, "review_proposals");

  const [modules, components, docIndex, proposedModules, proposedComponents] =
    await Promise.all([
      getModules(project.id),
      getComponents(project.id),
      // Deux requêtes pour tout l'index, et non une par brique : la page en
      // affiche des dizaines (cf. `listDocumentationIndex`).
      getDocumentationIndex(project.id),
      // La file n'est chargée que pour qui peut la traiter : inutile de payer
      // deux requêtes pour un rapporteur qui ne la verra pas.
      canReview ? getProposedModules(project.id) : [],
      canReview ? getProposedComponents(project.id) : [],
    ]);

  // Regroupement en mémoire : chaque brique reçoit les pages qui la décrivent.
  const docsByModule = new Map<string, typeof docIndex.modules[number]["page"][]>();
  for (const link of docIndex.modules) {
    docsByModule.set(link.moduleId, [
      ...(docsByModule.get(link.moduleId) ?? []),
      link.page,
    ]);
  }
  const docsByComponent = new Map<
    string,
    typeof docIndex.components[number]["page"][]
  >();
  for (const link of docIndex.components) {
    docsByComponent.set(link.componentId, [
      ...(docsByComponent.get(link.componentId) ?? []),
      link.page,
    ]);
  }

  const proposals: PendingProposal[] = [
    ...proposedModules.map((m) => ({
      id: m.id,
      entity: "module" as const,
      name: m.name,
      description: m.description,
      proposedBy: m.proposedBy?.name ?? m.proposedBy?.email ?? null,
    })),
    ...proposedComponents.map((c) => ({
      id: c.id,
      entity: "component" as const,
      name: c.name,
      description: c.description,
      kind: c.kind,
      moduleName: c.module?.name ?? null,
      proposedBy: c.proposedBy?.name ?? c.proposedBy?.email ?? null,
    })),
  ];

  // Options de rattachement proposées au moment de suggérer un composant :
  // uniquement les modules DÉJÀ validés (on ne rattache pas à une proposition).
  const moduleOptions = modules.map((m) => ({
    id: m.id,
    name: m.name,
    color: m.color,
  }));

  const transverse = components.filter((c) => !c.moduleId);

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="font-mono text-xs text-muted-foreground">{project.key}</p>
          <h1 className="text-2xl font-semibold tracking-tight">
            {t.structure.title}
          </h1>
          <p className="text-sm text-muted-foreground">{t.structure.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <ProposeModuleDialog projectId={project.id} />
          <ProposeComponentDialog
            projectId={project.id}
            modules={moduleOptions}
          />
        </div>
      </div>

      {/* Rappel explicite du partage des rôles pour qui ne peut pas configurer. */}
      {!admin && (
        <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
          {t.structure.readOnlyNotice}
        </p>
      )}

      {canReview && (
        <Card>
          <CardHeader>
            <CardTitle>{t.structure.pendingHeading}</CardTitle>
            <CardDescription>{t.structure.rejectHint}</CardDescription>
          </CardHeader>
          <CardContent>
            <ProposalQueue proposals={proposals} />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{t.structure.modulesHeading}</CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.structure.emptyModules}
            </p>
          ) : (
            <ul className="space-y-3">
              {modules.map((module) => {
                const attached = components.filter(
                  (c) => c.moduleId === module.id,
                );
                return (
                  <li key={module.id} className="space-y-1.5">
                    <ModuleBadge name={module.name} color={module.color} />
                    {module.description && (
                      <p className="text-sm text-muted-foreground">
                        {module.description}
                      </p>
                    )}
                    {attached.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {attached.map((c) => (
                          <ComponentBadge
                            key={c.id}
                            name={c.name}
                            kind={c.kind}
                            color={c.color}
                            kindLabel={t.taxonomy.componentKinds[c.kind]}
                          />
                        ))}
                      </div>
                    )}
                    {/* Ce qui est ÉCRIT sur ce module. Rien ne s'affiche s'il
                        n'y a rien : une ligne « aucune documentation » répétée
                        sous chaque brique serait un reproche, pas un
                        renseignement. */}
                    <DocumentingPages
                      pages={docsByModule.get(module.id) ?? []}
                      projectKey={project.key}
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.structure.componentsHeading}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {components.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t.structure.emptyComponents}
            </p>
          ) : (
            <ul className="space-y-2">
              {components.map((component) => (
                <li key={component.id} className="space-y-0.5">
                  <ComponentBadge
                    name={component.name}
                    kind={component.kind}
                    color={component.color}
                    kindLabel={t.taxonomy.componentKinds[component.kind]}
                  />
                  {component.description && (
                    <p className="text-sm text-muted-foreground">
                      {component.description}
                    </p>
                  )}
                  <DocumentingPages
                    pages={docsByComponent.get(component.id) ?? []}
                    projectKey={project.key}
                  />
                </li>
              ))}
            </ul>
          )}

          {transverse.length > 0 && (
            <div className="rounded-lg border border-dashed p-3">
              <p className="text-sm font-medium">
                {t.structure.transverseHeading}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {transverse.map((c) => c.name).join(" · ")}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
