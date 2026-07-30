"use server";

import type { z } from "zod";
import { assert, canCreateTicket } from "@/lib/policies";
import { assertProjectAccess } from "@/server/access";
import { generateMeetingFromTextSchema } from "@/lib/validators";
import {
  generateMeetingDraft,
  isBatchEnabled,
  isMistralConfigured,
  type MeetingDraftTheme,
} from "@/lib/mistral";
import {
  assertAiBudgetAvailable,
  estimateCostMicros,
  recordAiUsage,
} from "@/lib/ai-budget";
import { rateLimit } from "@/lib/rate-limit";
import { getWikiPage } from "@/server/services/wiki.service";
import { withUser } from "./helpers";
import type { ActionResult } from "./types";

/**
 * Construit un compte rendu à partir de notes brutes. Ne PERSISTE rien : les
 * thèmes proposés remplissent l'éditeur, où ils se relisent et se corrigent
 * avant enregistrement. Une analyse ratée ne laisse donc aucune trace.
 *
 * Mêmes garde-fous que la génération de tickets, et pour les mêmes raisons :
 * limite d'appels par utilisateur, plafond de dépense quotidien, accès au projet
 * imposé côté serveur.
 */
export async function generateMeetingFromTextAction(
  input: z.input<typeof generateMeetingFromTextSchema>,
): Promise<ActionResult<{ themes: MeetingDraftTheme[] }>> {
  return withUser<{ themes: MeetingDraftTheme[] }>(async (user) => {
    assert(canCreateTicket(user), "Vous devez être connecté.");
    if (!isMistralConfigured()) {
      return {
        ok: false,
        error: "La génération par IA n'est pas configurée sur ce serveur.",
      };
    }

    const data = generateMeetingFromTextSchema.parse(input);
    const page = await getWikiPage(data.pageId);
    if (!page) return { ok: false, error: "Page introuvable." };
    await assertProjectAccess(user, page.projectId);

    const limit = rateLimit(`ai-meeting:${user.id}`, 8, 60_000);
    if (!limit.ok) {
      return {
        ok: false,
        error: `Trop d'analyses. Réessayez dans ${limit.retryAfterSec} s.`,
      };
    }
    await assertAiBudgetAvailable();

    const { themes, usage } = await generateMeetingDraft(data.text);
    if (usage) {
      await recordAiUsage(
        estimateCostMicros(usage.promptTokens, usage.completionTokens, {
          batch: isBatchEnabled(),
        }),
      );
    }
    return { ok: true, data: { themes } };
  });
}
