import {
  generateTicketDrafts,
  MAX_GENERATED_TICKETS,
  type GenerateTicketDraftsResult,
} from "@/lib/mistral";
import { getProjectById } from "@/server/services/project.service";
import { listTicketTypes } from "@/server/services/tickettype.service";
import { listTicketPriorities } from "@/server/services/ticketpriority.service";

/**
 * Service « génération de tickets contextualisée » - accès données pur
 * (autorisation imposée dans les actions). Rôle : CONTEXTUALISER la demande.
 *
 * Il charge les métadonnées du projet (nom, clé, description) et sa taxonomie
 * (types / priorités), assemble un bloc de contexte lisible - enrichi des
 * consignes libres de l'utilisateur - puis délègue l'appel au module Mistral.
 * Centraliser cette logique ici garde les actions minces et le prompt cohérent.
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

/** Résultat de la suggestion : brouillons + usage (coût) + taxonomie du projet. */
export interface SuggestTicketsResult extends GenerateTicketDraftsResult {
  types: NamedRef[];
  priorities: NamedRef[];
}

/** Assemble un bloc de contexte lisible à partir des métadonnées + consignes. */
export function buildRequestContext(input: {
  projectName: string;
  projectKey: string;
  projectDescription?: string | null;
  instructions?: string | null;
}): string {
  const lines: string[] = [`Projet : ${input.projectName} (${input.projectKey}).`];
  const description = input.projectDescription?.trim();
  if (description) lines.push(`Description du projet : ${description}`);
  const instructions = input.instructions?.trim();
  if (instructions) lines.push(`Consignes de l'utilisateur : ${instructions}`);
  return lines.join("\n");
}

/**
 * Génère des brouillons de tickets à partir d'un texte, en contextualisant la
 * demande avec les infos du projet et les consignes fournies. Lève une erreur
 * explicite (message FR) en cas d'échec ; l'action la convertit en résultat.
 */
export async function suggestTicketsForProject(
  text: string,
  ctx: TicketRequestContext,
): Promise<SuggestTicketsResult> {
  const [project, types, priorities] = await Promise.all([
    getProjectById(ctx.projectId),
    listTicketTypes(ctx.projectId),
    listTicketPriorities(ctx.projectId),
  ]);
  if (!project) throw new Error("Projet introuvable.");

  const context = buildRequestContext({
    projectName: project.name,
    projectKey: project.key,
    projectDescription: project.description,
    instructions: ctx.instructions,
  });

  const { drafts, usage } = await generateTicketDrafts(text, {
    types: types.map((t) => t.name),
    priorities: priorities.map((p) => p.name),
    context,
    maxTickets: MAX_GENERATED_TICKETS,
  });

  return { drafts, usage, types, priorities };
}
