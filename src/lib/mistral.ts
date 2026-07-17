/**
 * Intégration Mistral AI - transforme un texte libre collé en un ou plusieurs
 * brouillons de tickets structurés. En `fetch` pur (aucune dépendance).
 *
 * Deux modes d'exécution :
 *  - Mode BATCH (défaut) : passe par l'API Batch de Mistral (Files + Batch jobs),
 *    ~50 % moins cher. Asynchrone : on téléverse la requête au format JSONL, on
 *    crée le job, on interroge son statut jusqu'à complétion (attente bornée),
 *    puis on télécharge le résultat. Adapté au déploiement mono-instance Node
 *    (pas de timeout serverless court). Basculable en synchrone via
 *    MISTRAL_USE_BATCH="false".
 *  - Mode SYNCHRONE : appel direct à /v1/chat/completions (réponse immédiate).
 *
 * IMPORTANT : module strictement serveur. `MISTRAL_API_KEY` est lue depuis
 * `process.env` côté serveur uniquement et n'est JAMAIS transmise au client
 * (n'importer ce module que depuis des Server Actions / routes API).
 *
 * Configuration (variables d'environnement serveur) :
 *   MISTRAL_API_KEY            clé API Mistral (obligatoire pour activer la feature)
 *   MISTRAL_MODEL              modèle à utiliser (défaut "mistral-medium-3.5")
 *   MISTRAL_USE_BATCH          "false" pour forcer l'appel synchrone (défaut : batch)
 *   MISTRAL_BATCH_TIMEOUT_MS   budget d'attente du job batch, en ms (défaut 120000)
 *   MISTRAL_API_URL            surcharge de l'endpoint chat (tests ; défaut API)
 *
 * Non configuré : `isMistralConfigured()` renvoie false (l'UI masque alors la
 * fonctionnalité) ; `generateTicketDrafts` lève une erreur explicite si appelé.
 */

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

interface BatchJob {
  id?: string;
  status?: string;
  output_file?: string;
  error_file?: string;
}

const DEFAULT_CHAT_URL = "https://api.mistral.ai/v1/chat/completions";
const DEFAULT_API_BASE = "https://api.mistral.ai";
// Mistral Medium 3.5 (alias d'API). Pin daté équivalent : "mistral-medium-3-5-26-04".
const DEFAULT_MODEL = "mistral-medium-3.5";
const DEFAULT_BATCH_TIMEOUT_MS = 120_000;
const BATCH_POLL_INTERVAL_MS = 2500;
const BATCH_TERMINAL_FAILURE = new Set([
  "FAILED",
  "CANCELLED",
  "CANCELLATION_REQUESTED",
  "TIMEOUT_EXCEEDED",
]);

/** Garde-fou : nombre maximal de tickets générés en une passe (coût / abus). */
export const MAX_GENERATED_TICKETS = 20;

/** Brouillon de ticket produit par le modèle (non encore persisté). */
export interface TicketDraft {
  title: string;
  description: string | null;
  /** Nom du type suggéré (à rapprocher des types du projet) - peut être null. */
  type: string | null;
  /** Nom de la priorité suggérée (à rapprocher des priorités du projet). */
  priority: string | null;
}

export interface GenerateTicketDraftsOptions {
  /** Noms des types disponibles pour le projet (aide le modèle au mapping). */
  types?: string[];
  /** Noms des priorités disponibles pour le projet (aide le modèle au mapping). */
  priorities?: string[];
  /** Limite haute de tickets à produire (bornée par `MAX_GENERATED_TICKETS`). */
  maxTickets?: number;
}

/** Vrai si l'intégration Mistral est configurée (clé API présente). */
export function isMistralConfigured(): boolean {
  return !!process.env.MISTRAL_API_KEY;
}

/** Vrai si le mode batch est actif (défaut). `MISTRAL_USE_BATCH="false"` = synchrone. */
export function isBatchEnabled(): boolean {
  return process.env.MISTRAL_USE_BATCH?.toLowerCase() !== "false";
}

/** Base d'API pour les endpoints Files/Batch (dérivée de l'override chat, sinon défaut). */
function apiBase(): string {
  const url = process.env.MISTRAL_API_URL;
  if (url) {
    try {
      return new URL(url).origin;
    } catch {
      /* URL invalide : on retombe sur la base par défaut. */
    }
  }
  return DEFAULT_API_BASE;
}

/** Budget d'attente d'un job batch, en ms (borné, surchargeable). */
function batchTimeoutMs(): number {
  const raw = Number(process.env.MISTRAL_BATCH_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_BATCH_TIMEOUT_MS;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** `fetch` avec messages d'erreur FR homogènes (réseau + statut HTTP). */
async function fetchOrThrow(
  url: string,
  init: RequestInit,
  label: string,
): Promise<Response> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch (e) {
    throw new Error(
      `Appel à l'API Mistral impossible (${label}) : ${
        e instanceof Error ? e.message : "erreur réseau"
      }.`,
    );
  }
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Erreur de l'API Mistral (${res.status}, ${label}) : ${body.slice(0, 200)}`,
    );
  }
  return res;
}

/** Construit le prompt système, en injectant types/priorités disponibles. */
function buildSystemPrompt(opts: {
  types?: string[];
  priorities?: string[];
  maxTickets: number;
}): string {
  const typeList = opts.types?.length ? opts.types.join(", ") : "(aucun imposé)";
  const prioList = opts.priorities?.length
    ? opts.priorities.join(", ")
    : "(aucune imposée)";
  return [
    "Tu es un assistant qui transforme un texte libre (notes de réunion, e-mail,",
    "compte-rendu, liste de tâches…) en tickets de suivi clairs et actionnables.",
    "Analyse le texte et identifie chaque tâche/problème distinct : produis un",
    `ticket par élément identifié, au maximum ${opts.maxTickets}. Si le texte ne`,
    "décrit qu'une seule tâche, renvoie un unique ticket.",
    "",
    "Réponds STRICTEMENT en JSON valide, sans texte ni balise autour, avec la forme :",
    '{ "tickets": [ { "title": string, "description": string, "type": string|null, "priority": string|null } ] }',
    "",
    "Règles :",
    "- title : concis (max 200 caractères), en français, à l'impératif si possible.",
    "- description : détails utiles issus du texte (contexte, critères). Peut être vide (\"\").",
    `- type : l'un de ces types EXACTS si pertinent, sinon null : ${typeList}.`,
    `- priority : l'une de ces priorités EXACTES si pertinent, sinon null : ${prioList}.`,
    "- N'invente aucune information absente du texte.",
  ].join("\n");
}

/** Parse et normalise la réponse JSON du modèle en brouillons de tickets. */
function parseDrafts(content: string): TicketDraft[] {
  let data: unknown;
  try {
    data = JSON.parse(content);
  } catch {
    throw new Error("Réponse de l'API Mistral illisible (JSON invalide).");
  }

  // Le modèle peut renvoyer `{ tickets: [...] }` ou directement un tableau.
  const rawList: unknown[] = Array.isArray(data)
    ? data
    : Array.isArray((data as { tickets?: unknown } | null)?.tickets)
      ? (data as { tickets: unknown[] }).tickets
      : [];

  const drafts: TicketDraft[] = [];
  for (const item of rawList) {
    if (!item || typeof item !== "object") continue;
    const obj = item as Record<string, unknown>;
    const title = typeof obj.title === "string" ? obj.title.trim() : "";
    if (!title) continue;
    const description =
      typeof obj.description === "string" && obj.description.trim()
        ? obj.description.trim()
        : null;
    const type =
      typeof obj.type === "string" && obj.type.trim() ? obj.type.trim() : null;
    const priority =
      typeof obj.priority === "string" && obj.priority.trim()
        ? obj.priority.trim()
        : null;
    drafts.push({ title: title.slice(0, 200), description, type, priority });
  }
  return drafts;
}

/** Corps commun d'une requête chat (réutilisé par les deux modes). */
function chatRequestBody(model: string, messages: ChatMessage[]) {
  return {
    model,
    temperature: 0.2,
    response_format: { type: "json_object" as const },
    messages,
  };
}

/** Mode SYNCHRONE : appel direct à /v1/chat/completions, renvoie le contenu texte. */
async function callChatSync(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const url = process.env.MISTRAL_API_URL || DEFAULT_CHAT_URL;
  const res = await fetchOrThrow(
    url,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(chatRequestBody(model, messages)),
    },
    "chat completions",
  );
  const payload = (await res.json().catch(() => null)) as {
    choices?: Array<{ message?: { content?: string } }>;
  } | null;
  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide de l'API Mistral.");
  return content;
}

/** Extrait le contenu texte de la 1re ligne du JSONL de sortie d'un job batch. */
function extractBatchContent(jsonl: string): string {
  const lines = jsonl
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new Error("Résultat du traitement par lot vide.");

  let parsed: unknown;
  try {
    parsed = JSON.parse(lines[0]);
  } catch {
    throw new Error("Résultat du traitement par lot Mistral illisible.");
  }
  const entry = parsed as {
    error?: unknown;
    response?: { body?: { choices?: Array<{ message?: { content?: string } }> } };
  };
  if (entry.error) {
    throw new Error("Une requête du lot Mistral a échoué (voir logs Mistral).");
  }
  const content = entry.response?.body?.choices?.[0]?.message?.content;
  if (!content) throw new Error("Réponse vide dans le lot Mistral.");
  return content;
}

/**
 * Mode BATCH : téléverse la requête (JSONL), crée le job, attend sa complétion
 * (attente bornée par `batchTimeoutMs`), puis télécharge et extrait le contenu.
 */
async function callChatBatch(
  apiKey: string,
  model: string,
  messages: ChatMessage[],
): Promise<string> {
  const base = apiBase();
  const authHeader = { Authorization: `Bearer ${apiKey}` };

  // 1) Fichier d'entrée JSONL : une seule requête (custom_id "0"). Le modèle est
  //    fixé au niveau du job, il est donc omis du corps de la ligne.
  const jsonl =
    JSON.stringify({
      custom_id: "0",
      body: {
        messages,
        temperature: 0.2,
        response_format: { type: "json_object" },
      },
    }) + "\n";

  const form = new FormData();
  form.append("purpose", "batch");
  form.append(
    "file",
    new Blob([jsonl], { type: "application/jsonl" }),
    "tickets-input.jsonl",
  );

  const upRes = await fetchOrThrow(
    `${base}/v1/files`,
    { method: "POST", headers: authHeader, body: form },
    "téléversement du fichier",
  );
  const upJson = (await upRes.json().catch(() => null)) as { id?: string } | null;
  const inputFileId = upJson?.id;
  if (!inputFileId) {
    throw new Error("Téléversement Mistral sans identifiant de fichier.");
  }

  // 2) Création du job batch (endpoint chat, modèle au niveau du job).
  const createRes = await fetchOrThrow(
    `${base}/v1/batch/jobs`,
    {
      method: "POST",
      headers: { ...authHeader, "Content-Type": "application/json" },
      body: JSON.stringify({
        input_files: [inputFileId],
        endpoint: "/v1/chat/completions",
        model,
        metadata: { app: "artemis", feature: "ticket-generation" },
        timeout_hours: 24,
      }),
    },
    "création du lot",
  );
  let job = (await createRes.json().catch(() => null)) as BatchJob | null;
  if (!job?.id) throw new Error("Création du lot Mistral sans identifiant de job.");

  // 3) Attente bornée de la complétion (interrogation périodique du statut).
  const deadline = Date.now() + batchTimeoutMs();
  for (;;) {
    const status = (job.status ?? "").toUpperCase();
    if (status === "SUCCESS") break;
    if (BATCH_TERMINAL_FAILURE.has(status)) {
      throw new Error(
        `Le traitement par lot Mistral a échoué (statut ${status || "inconnu"}).`,
      );
    }
    if (Date.now() >= deadline) {
      throw new Error(
        "Le traitement par lot Mistral dépasse le délai imparti. Réessayez, ou " +
          "basculez en mode synchrone (MISTRAL_USE_BATCH=false).",
      );
    }
    await sleep(BATCH_POLL_INTERVAL_MS);
    const pollRes = await fetchOrThrow(
      `${base}/v1/batch/jobs/${job.id}`,
      { headers: authHeader },
      "suivi du lot",
    );
    const next = (await pollRes.json().catch(() => null)) as BatchJob | null;
    if (!next?.id) throw new Error("Suivi du lot Mistral illisible.");
    job = next;
  }

  if (!job.output_file) {
    throw new Error("Le lot Mistral n'a produit aucun fichier de résultat.");
  }

  // 4) Téléchargement du JSONL de sortie + extraction du contenu.
  const outRes = await fetchOrThrow(
    `${base}/v1/files/${job.output_file}/content`,
    { headers: authHeader },
    "récupération du résultat",
  );
  const outText = await outRes.text();
  return extractBatchContent(outText);
}

/**
 * Appelle Mistral pour extraire des brouillons de tickets d'un texte libre.
 * Utilise le mode batch (défaut) ou synchrone selon `MISTRAL_USE_BATCH`. Lève une
 * erreur explicite (message FR) en cas d'échec ; l'appelant (Server Action) la
 * convertit en `{ ok:false, error }`.
 */
export async function generateTicketDrafts(
  text: string,
  options: GenerateTicketDraftsOptions = {},
): Promise<TicketDraft[]> {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) throw new Error("L'intégration Mistral n'est pas configurée.");

  const trimmed = text.trim();
  if (!trimmed) throw new Error("Le texte à analyser est vide.");

  const model = process.env.MISTRAL_MODEL || DEFAULT_MODEL;
  const maxTickets = Math.max(
    1,
    Math.min(options.maxTickets ?? MAX_GENERATED_TICKETS, MAX_GENERATED_TICKETS),
  );

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        types: options.types,
        priorities: options.priorities,
        maxTickets,
      }),
    },
    { role: "user", content: trimmed },
  ];

  const content = isBatchEnabled()
    ? await callChatBatch(apiKey, model, messages)
    : await callChatSync(apiKey, model, messages);

  const drafts = parseDrafts(content);
  if (drafts.length === 0) {
    throw new Error("Aucun ticket n'a pu être extrait du texte fourni.");
  }
  return drafts.slice(0, maxTickets);
}
