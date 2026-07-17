"use server";

import type { z } from "zod";
import { assert, canCreateTicket } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import {
  createTicketsFromDraftsSchema,
  generateTicketsFromTextSchema,
} from "@/lib/validators";
import {
  generateTicketDrafts,
  isMistralConfigured,
  MAX_GENERATED_TICKETS,
} from "@/lib/mistral";
import { rateLimit } from "@/lib/rate-limit";
import { createTicket } from "@/server/services/ticket.service";
import { listTicketTypes } from "@/server/services/tickettype.service";
import { listTicketPriorities } from "@/server/services/ticketpriority.service";
import { revalidateBoardAndList, withUser } from "./helpers";
import type { ActionResult } from "./types";

/** Ticket suggéré par l'IA (non encore créé), à réviser dans l'UI. */
export interface SuggestedTicket {
  title: string;
  description: string | null;
  /** Id du type du projet rapproché de la suggestion (ou null si aucun). */
  typeId: string | null;
  /** Id de la priorité du projet rapprochée de la suggestion (ou null). */
  priorityId: string | null;
}

/** Résumé d'un ticket effectivement créé, renvoyé à l'UI. */
export interface GeneratedTicketSummary {
  id: string;
  key: string;
  title: string;
}

/** Rapproche un nom (suggéré par l'IA) d'un enregistrement du projet, par nom (insensible à la casse). */
function matchByName<T extends { id: string; name: string }>(
  list: T[],
  name: string | null,
): string | null {
  if (!name) return null;
  const target = name.trim().toLowerCase();
  return list.find((x) => x.name.trim().toLowerCase() === target)?.id ?? null;
}

/**
 * Étape 1 — Analyse un texte libre collé via Mistral et renvoie des tickets
 * SUGGÉRÉS (titre, description, type/priorité rapprochés du projet) SANS rien
 * créer. L'utilisateur les révise ensuite dans l'UI avant validation.
 * Respecte l'authentification / les policies : connecté + accès au projet.
 */
export async function suggestTicketsFromTextAction(
  input: z.input<typeof generateTicketsFromTextSchema>,
): Promise<ActionResult<{ tickets: SuggestedTicket[] }>> {
  return withUser<{ tickets: SuggestedTicket[] }>(async (user) => {
    assert(canCreateTicket(user), "Vous devez être connecté pour créer un ticket.");
    if (!isMistralConfigured()) {
      return {
        ok: false,
        error: "La génération par IA n'est pas configurée sur ce serveur.",
      };
    }

    const data = generateTicketsFromTextSchema.parse(input);
    await assertProjectAccess(user, data.projectId);

    // Garde-fou coût/abus : quelques analyses par utilisateur et par minute.
    const limit = rateLimit(`ai-suggest:${user.id}`, 8, 60_000);
    if (!limit.ok) {
      return {
        ok: false,
        error: `Trop d'analyses. Réessayez dans ${limit.retryAfterSec} s.`,
      };
    }

    // Types/priorités du projet : servent à mapper le nom suggéré par l'IA -> id.
    const [types, priorities] = await Promise.all([
      listTicketTypes(data.projectId),
      listTicketPriorities(data.projectId),
    ]);

    const drafts = await generateTicketDrafts(data.text, {
      types: types.map((t) => t.name),
      priorities: priorities.map((p) => p.name),
      maxTickets: MAX_GENERATED_TICKETS,
    });

    const tickets: SuggestedTicket[] = drafts.map((draft) => ({
      title: draft.title,
      description: draft.description,
      typeId: matchByName(types, draft.type),
      priorityId: matchByName(priorities, draft.priority),
    }));

    return { ok: true, data: { tickets } };
  });
}

/**
 * Étape 2 — Crée les tickets validés dans l'écran de revue. Réutilise
 * `createTicket` (mêmes règles de cohérence projet). Les `typeId`/`priorityId`
 * sont vérifiés comme appartenant au projet ; sinon ignorés (défaut du service).
 * Respecte l'authentification / les policies : connecté + accès au projet.
 */
export async function createTicketsFromDraftsAction(
  input: z.input<typeof createTicketsFromDraftsSchema>,
): Promise<ActionResult<{ tickets: GeneratedTicketSummary[] }>> {
  return withUser<{ tickets: GeneratedTicketSummary[] }>(async (user) => {
    assert(canCreateTicket(user), "Vous devez être connecté pour créer un ticket.");
    const data = createTicketsFromDraftsSchema.parse(input);
    await assertProjectAccess(user, data.projectId);

    // Vérifie que les type/priorité fournis appartiennent bien au projet
    // (défense en profondeur : l'UI les peuple depuis les options du projet).
    const [types, priorities] = await Promise.all([
      listTicketTypes(data.projectId),
      listTicketPriorities(data.projectId),
    ]);
    const typeIds = new Set(types.map((t) => t.id));
    const priorityIds = new Set(priorities.map((p) => p.id));

    // Création séquentielle : chaque `createTicket` incrémente `ticketSeq` dans sa
    // propre transaction ; on évite ainsi les conflits sur la séquence du projet.
    const created: GeneratedTicketSummary[] = [];
    for (const draft of data.tickets) {
      const typeId = draft.typeId && typeIds.has(draft.typeId) ? draft.typeId : undefined;
      const priorityId =
        draft.priorityId && priorityIds.has(draft.priorityId)
          ? draft.priorityId
          : undefined;
      const ticket = await createTicket(
        {
          projectId: data.projectId,
          title: draft.title,
          description: draft.description ?? null,
          typeId,
          priorityId,
        },
        user.id,
      );
      created.push({ id: ticket.id, key: ticket.key, title: ticket.title });
    }

    // Note : les tickets créés depuis un texte n'ont pas d'assigné ; aucune
    // notification d'assignation à envoyer (parité avec la création manuelle).
    revalidateBoardAndList();
    return { ok: true, data: { tickets: created } };
  });
}
