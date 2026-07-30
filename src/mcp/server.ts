import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { resolveActor } from "./actor";
import {
  mcpCommentTicket,
  mcpCreateTicket,
  mcpGetTicket,
  mcpListComponents,
  mcpListModules,
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
    "list_modules",
    {
      title: "Lister les modules",
      description:
        "Liste les modules fonctionnels d'un projet (nom, description) et les " +
        "composants regroupes par chacun. Un module est un pan du produit a grosse " +
        "maille, au-dessus des composants : c'est la vue d'ensemble.",
      inputSchema: { project: z.string().describe("Cle du projet, ex. RKN") },
    },
    async ({ project }) => runTool(() => mcpListModules(actor, project)),
  );

  server.registerTool(
    "list_components",
    {
      title: "Lister les composants",
      description:
        "Liste les composants applicatifs d'un projet (nom, nature PAGE / SHARED / " +
        "SERVICE, description). Sert a situer un ticket dans l'application.",
      inputSchema: { project: z.string().describe("Cle du projet, ex. RKN") },
    },
    async ({ project }) => runTool(() => mcpListComponents(actor, project)),
  );

  server.registerTool(
    "list_tickets",
    {
      title: "Lister les tickets",
      description:
        "Liste les tickets d'un projet. Filtres optionnels : status (nom de colonne), " +
        'assignee ("me", "unassigned" ou un e-mail), component (nom du composant), ' +
        "module (nom du module, y compris les tickets rattaches via leur composant), limit.",
      inputSchema: {
        project: z.string().describe("Cle du projet, ex. RKN"),
        status: z.string().optional().describe("Filtrer par statut / colonne"),
        assignee: z
          .string()
          .optional()
          .describe('"me", "unassigned" ou un e-mail'),
        component: z.string().optional().describe("Filtrer par composant"),
        module: z.string().optional().describe("Filtrer par module"),
        limit: z.number().int().positive().max(100).optional(),
      },
    },
    async ({ project, status, assignee, component, module, limit }) =>
      runTool(() =>
        mcpListTickets(actor, {
          projectKey: project,
          status,
          assignee,
          component,
          module,
          limit,
        }),
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
    "create_ticket",
    {
      title: "Creer un ticket",
      description:
        "Cree un ticket dans un projet (place dans la 1re colonne du workflow). " +
        "L'assistant en est le rapporteur. Type, priorite, composant, module et " +
        "assigne sont optionnels ; sans valeur, les defauts du projet s'appliquent. " +
        "Preferer le composant quand la demande vise une brique precise ; le module " +
        "sert aux demandes a grosse maille et n'est retenu qu'a defaut de composant. " +
        "Certains types imposent un MODELE de description : la creation echoue alors " +
        "tant que la description ne comporte pas les rubriques Markdown attendues " +
        "(## Observation, ## Attendu, ## Contexte ; ## Alignement aux specifications " +
        "est facultatif). Le message d'erreur nomme les rubriques manquantes.",
      inputSchema: {
        project: z.string().describe("Cle du projet, ex. RKN"),
        title: z.string().min(1).max(200).describe("Titre du ticket"),
        description: z
          .string()
          .max(20000)
          .optional()
          .describe(
            "Description du ticket (Markdown). Si le type impose un modele, " +
              "structurer en rubriques : ## Observation / ## Attendu / ## Contexte.",
          ),
        type: z
          .string()
          .optional()
          .describe("Nom du type (defaut : type par defaut du projet)"),
        priority: z
          .string()
          .optional()
          .describe("Nom de la priorite (defaut : priorite par defaut du projet)"),
        component: z
          .string()
          .optional()
          .describe("Nom du composant concerne (defaut : aucun)"),
        module: z
          .string()
          .optional()
          .describe(
            "Nom du module concerne (defaut : aucun). Ne s'applique que si aucun " +
              "composant n'est fourni : sinon le module du composant prime.",
          ),
        assignee: z
          .string()
          .optional()
          .describe('"me" ou un e-mail (defaut : non assigne)'),
      },
    },
    async ({
      project,
      title,
      description,
      type,
      priority,
      component,
      module,
      assignee,
    }) =>
      runTool(() =>
        mcpCreateTicket(actor, {
          projectKey: project,
          title,
          description,
          type,
          priority,
          component,
          module,
          assignee,
        }),
      ),
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
        "pris en charge par l'assistant. La description remplace l'ancienne : si le " +
        "type impose un modele, la nouvelle doit elle aussi porter les rubriques " +
        "(## Observation, ## Attendu, ## Contexte), sinon la mise a jour est refusee.",
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
