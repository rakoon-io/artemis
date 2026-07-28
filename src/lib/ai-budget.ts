/**
 * Plafond de dépense quotidien pour la génération de tickets par IA (Mistral).
 *
 * Optionnel : si `AI_DAILY_BUDGET_USD` est absent, aucune limite n'est appliquée
 * (comportement actuel préservé). Utilisé en mode démo pour éviter toute dérive
 * de coût sur une clé API partagée avec des visiteurs non authentifiés au sens
 * métier (comptes de démo publics).
 *
 * Le coût est estimé à partir des tokens renvoyés par l'API Mistral
 * (`usage.prompt_tokens` / `usage.completion_tokens`) et des tarifs configurés
 * (par défaut ceux de mistral-medium-3.5 au 2026-07, à ajuster si le contrat
 * réel diffère - voir `.env.example`). Le mode Batch (actif par défaut,
 * voir `mistral.ts`) bénéficie d'une remise de 50 % appliquée ici.
 *
 * Le cumul est stocké en base (`AiUsageDay`, clé = date UTC) plutôt qu'en
 * mémoire process, pour rester correct malgré les redémarrages du conteneur.
 */
import { prisma } from "@/lib/db";

const MICROS_PER_USD = 1_000_000;

// Tarifs par défaut mistral-medium-3.5 (juillet 2026, $/million de tokens).
// Le mode Batch (défaut de l'app) applique une remise de 50 % en plus.
const DEFAULT_INPUT_PRICE_PER_MTOK_USD = 1.5;
const DEFAULT_OUTPUT_PRICE_PER_MTOK_USD = 7.5;
const BATCH_DISCOUNT = 0.5;

function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function positiveNumber(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/** Plafond configuré, en micro-USD, ou `null` si aucun plafond n'est défini. */
export function dailyBudgetMicros(): number | null {
  const raw = process.env.AI_DAILY_BUDGET_USD;
  if (!raw || !raw.trim()) return null;
  const usd = Number(raw);
  if (!Number.isFinite(usd) || usd < 0) return null;
  return Math.round(usd * MICROS_PER_USD);
}

/** Estime le coût (micro-USD) d'un appel à partir des tokens consommés. */
export function estimateCostMicros(
  promptTokens: number,
  completionTokens: number,
  options: { batch: boolean },
): number {
  const inPrice = positiveNumber(
    process.env.MISTRAL_INPUT_PRICE_PER_MTOK_USD,
    DEFAULT_INPUT_PRICE_PER_MTOK_USD,
  );
  const outPrice = positiveNumber(
    process.env.MISTRAL_OUTPUT_PRICE_PER_MTOK_USD,
    DEFAULT_OUTPUT_PRICE_PER_MTOK_USD,
  );
  const rawUsd =
    (promptTokens * inPrice + completionTokens * outPrice) / 1_000_000;
  const usd = options.batch ? rawUsd * BATCH_DISCOUNT : rawUsd;
  return Math.max(0, Math.round(usd * MICROS_PER_USD));
}

/**
 * Lève une erreur (message FR, sûr à afficher à l'utilisateur) si le budget
 * IA du jour est déjà atteint. Ne fait rien si aucun plafond n'est configuré.
 */
export async function assertAiBudgetAvailable(): Promise<void> {
  const budget = dailyBudgetMicros();
  if (budget === null) return;

  const usage = await prisma.aiUsageDay.findUnique({ where: { date: todayUtc() } });
  const spent = usage?.costMicros ?? 0;
  if (spent >= budget) {
    const budgetUsd = (budget / MICROS_PER_USD).toFixed(2);
    throw new Error(
      `Budget IA quotidien atteint (${budgetUsd} $/jour). Réessayez demain.`,
    );
  }
}

/** Enregistre le coût d'un appel réussi dans le cumul du jour (idempotent-additif). */
export async function recordAiUsage(costMicros: number): Promise<void> {
  if (costMicros <= 0) return;
  const date = todayUtc();
  await prisma.aiUsageDay.upsert({
    where: { date },
    create: { date, costMicros, callCount: 1 },
    update: { costMicros: { increment: costMicros }, callCount: { increment: 1 } },
  });
}

/** Reste disponible aujourd'hui, en USD (`null` = pas de plafond configuré). */
export async function remainingBudgetUsd(): Promise<number | null> {
  const budget = dailyBudgetMicros();
  if (budget === null) return null;
  const usage = await prisma.aiUsageDay.findUnique({ where: { date: todayUtc() } });
  const spent = usage?.costMicros ?? 0;
  return Math.max(0, budget - spent) / MICROS_PER_USD;
}
