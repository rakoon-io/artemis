import {
  generateTicketDrafts,
  MAX_GENERATED_TICKETS,
  type GenerateTicketDraftsResult,
} from "@/lib/mistral";
import {
  buildRequestContext,
  collapse,
  selectContextComponents,
} from "@/lib/ai-context";
import { getProjectById } from "@/server/services/project.service";
import { listComponents } from "@/server/services/component.service";
import { listModules } from "@/server/services/module.service";
import { TicketTemplate } from "@prisma/client";
import { listTicketTypes } from "@/server/services/tickettype.service";
import { listTicketPriorities } from "@/server/services/ticketpriority.service";

/**
 * Service « génération de tickets contextualisée » - accès données pur
 * (autorisation imposée dans les actions). Rôle : CONTEXTUALISER la demande.
 *
 * Il charge les métadonnées du projet (nom, clé, description), sa taxonomie
 * (types / priorités) et son CATALOGUE DE COMPOSANTS (page / composant
 * réutilisable / service, avec leur description), délègue l'assemblage du bloc
 * de contexte au module pur `@/lib/ai-context`, puis appelle Mistral. Centraliser
 * cette logique ici garde les actions minces et le prompt cohérent.
 */

/** Élément de taxonomie minimal (id + nom) pour le rapprochement côté action. */
export interface NamedRef {
  id: string;
  name: string;
}

/** Contexte structuré d'une demande de génération de tickets. */
export interface TicketRequestContext {
  projectId: string;
  /** Consignes libres saisies par l'utilisateur pour cette demande (facultatif). */
  instructions?: string | null;
}

/**
 * Résultat de la suggestion : brouillons + usage (coût) + référentiels du projet
 * (types, priorités, composants) permettant à l'action de rapprocher par nom les
 * valeurs proposées par le modèle.
 */
export interface SuggestTicketsResult extends GenerateTicketDraftsResult {
  types: NamedRef[];
  priorities: NamedRef[];
  components: NamedRef[];
}

// L'assemblage du contexte vit désormais dans `@/lib/ai-context` (module pur,
// sans accès base, donc testable isolément). On le ré-exporte pour conserver le
// point d'entrée historique de ce service.
export { buildRequestContext } from "@/lib/ai-context";

/**
 * Génère des brouillons de tickets à partir d'un texte, en contextualisant la
 * demande avec les infos du projet, son catalogue de composants et les consignes
 * fournies. Lève une erreur explicite (message FR) en cas d'échec ; l'action la
 * convertit en résultat.
 */
export async function suggestTicketsForProject(
  text: string,
  ctx: TicketRequestContext,
): Promise<SuggestTicketsResult> {
  const [project, types, priorities, components, modules] = await Promise.all([
    getProjectById(ctx.projectId),
    listTicketTypes(ctx.projectId),
    listTicketPriorities(ctx.projectId),
    listComponents(ctx.projectId),
    listModules(ctx.projectId),
  ]);
  if (!project) throw new Error("Projet introuvable.");

  const componentContexts = components.map((c) => ({
    name: c.name,
    kind: c.kind,
    description: c.description,
    moduleName: c.module?.name ?? null,
  }));

  const context = buildRequestContext({
    projectName: project.name,
    projectKey: project.key,
    projectDescription: project.description,
    modules: modules.map((m) => ({ name: m.name, description: m.description })),
    components: componentContexts,
    instructions: ctx.instructions,
  });

  // Les deux vues du catalogue passent par le MÊME sélecteur : le bloc de
  // contexte en décrit une partie, la liste ci-dessous énonce tous les noms
  // sélectionnables. `named` est un sur-ensemble de ce qui est décrit - un
  // composant reste donc suggérable même si sa description n'a pas tenu dans le
  // contexte, sans quoi un gros catalogue rendrait sa queue inaccessible.
  const { named } = selectContextComponents(componentContexts);

  const { drafts, usage } = await generateTicketDrafts(text, {
    types: types.map((t) => t.name),
    priorities: priorities.map((p) => p.name),
    // Aplatis comme dans le bloc de contexte : sans cela, un nom contenant un
    // retour à la ligne serait présenté sous deux graphies différentes au modèle,
    // et le rapprochement par nom échouerait.
    components: named.map((c) => collapse(c.name)),
    // Les types qui exigent un rapport : le modele doit produire les rubriques,
    // faute de quoi la creation echouerait apres coup.
    reportTypes: types
      .filter((type) => type.template === TicketTemplate.REPORT)
      .map((type) => type.name),
    context,
    maxTickets: MAX_GENERATED_TICKETS,
  });

  return { drafts, usage, types, priorities, components };
}
