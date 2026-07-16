import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolveActor } from "./actor";
import {
  mcpCommentTicket,
  mcpGetTicket,
  mcpListProjects,
  mcpListStatuses,
  mcpListTickets,
  mcpMoveTicket,
  mcpTakeTicket,
  mcpUpdateTicket,
} from "./service";

/**
 * Serveur MCP d'Artemis : expose a une IA les operations de prise en charge de
 * tickets (lister, lire, prendre en charge, commenter, faire avancer). L'IA agit
 * au nom d'un compte de service (ARTEMIS_MCP_ACTOR_EMAIL) et les memes regles
 * d'acces que le web sont imposees. Transport stdio.
 */

/** Execute la logique d'un outil et formate le resultat (ou l'erreur) en contenu MCP. */
async function runTool(fn: () => Promise<unknown>) {
  try {
    const data = await fn();
    return {
      content: [
        { type: "text" as const, text: JSON.stringify(data, null, 2) },
      ],
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erreur inattendue.";
    return {
      content: [{ type: "text" as const, text: message }],
      isError: true,
    };
  }
}

async function main() {
  const actor = await resolveActor();
  const server = new McpServer({ name: "artemis-tickets", version: "1.0.0" });

  server.registerTool(
    "list_projects",
    {
      title: "Lister les projets",
      description:
        "Liste les projets accessibles a l'assistant (cle, nom, description).",
      inputSchema: {},
    },
    async () => runTool(() => mcpListProjects(actor)),
  );

  server.registerTool(
    "list_statuses",
    {
      title: "Lister les statuts",
      description:
        "Liste les statuts (colonnes du workflow) d'un projet, dans l'ordre.",
      inputSchema: { project: z.string().describe("Cle du projet, ex. RKN") },
    },
    async ({ project }) => runTool(() => mcpListStatuses(actor, project)),
  );

  server.registerTool(
    "list_tickets",
    {
      title: "Lister les tickets",
      description:
        "Liste les tickets d'un projet. Filtres optionnels : status (nom de colonne), " +
        'assignee ("me", "unassigned" ou un e-mail), limit.',
      inputSchema: {
        project: z.string().describe("Cle du projet, ex. RKN"),
        status: z.string().optional().describe("Filtrer par statut / colonne"),
        assignee: z
          .string()
          .optional()
          .describe('"me", "unassigned" ou un e-mail'),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ project, status, assignee, limit }) =>
      runTool(() =>
        mcpListTickets(actor, { projectKey: project, status, assignee, limit }),
      ),
  );

  server.registerTool(
    "get_ticket",
    {
      title: "Detail d'un ticket",
      description:
        "Renvoie le detail complet d'un ticket (description, statut, assigne, " +
        "labels, pieces jointes, commentaires) a partir de sa cle.",
      inputSchema: { key: z.string().describe("Cle du ticket, ex. RKN-3") },
    },
    async ({ key }) => runTool(() => mcpGetTicket(actor, key)),
  );

  server.registerTool(
    "take_ticket",
    {
      title: "Prendre en charge un ticket",
      description:
        "Prend un ticket en charge : se l'assigne et le passe au statut « en cours ». " +
        "Echoue si le ticket est deja assigne a quelqu'un d'autre.",
      inputSchema: { key: z.string().describe("Cle du ticket, ex. RKN-3") },
    },
    async ({ key }) => runTool(() => mcpTakeTicket(actor, key)),
  );

  server.registerTool(
    "comment_ticket",
    {
      title: "Commenter un ticket",
      description: "Ajoute un commentaire a un ticket accessible.",
      inputSchema: {
        key: z.string().describe("Cle du ticket, ex. RKN-3"),
        body: z.string().min(1).describe("Contenu du commentaire (Markdown)"),
      },
    },
    async ({ key, body }) => runTool(() => mcpCommentTicket(actor, key, body)),
  );

  server.registerTool(
    "move_ticket",
    {
      title: "Changer le statut d'un ticket",
      description:
        "Deplace un ticket vers un statut (colonne). Reserve aux tickets pris en " +
        "charge par l'assistant.",
      inputSchema: {
        key: z.string().describe("Cle du ticket, ex. RKN-3"),
        status: z.string().describe("Nom du statut / colonne cible"),
      },
    },
    async ({ key, status }) => runTool(() => mcpMoveTicket(actor, key, status)),
  );

  server.registerTool(
    "update_ticket",
    {
      title: "Mettre a jour un ticket",
      description:
        "Met a jour le titre et/ou la description d'un ticket. Reserve aux tickets " +
        "pris en charge par l'assistant.",
      inputSchema: {
        key: z.string().describe("Cle du ticket, ex. RKN-3"),
        title: z.string().min(1).max(200).optional(),
        description: z.string().max(20000).optional(),
      },
    },
    async ({ key, title, description }) =>
      runTool(() => mcpUpdateTicket(actor, key, { title, description })),
  );

  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr uniquement : stdout est le canal JSON-RPC.
  console.error(
    `Serveur MCP Artemis pret. Acteur : ${actor.name?.trim() || actor.email}.`,
  );
}

main().catch((error) => {
  console.error("Echec du demarrage du serveur MCP :", error);
  process.exit(1);
});
