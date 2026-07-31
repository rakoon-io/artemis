import { z } from "zod";

/**
 * Validation des variables d'environnement (env validées via Zod).
 * On utilise `safeParse` pour ne pas casser le build quand les variables ne sont pas
 * présentes (le rendu des pages qui touchent la DB est dynamique, pas prérendu au build).
 */
const schema = z.object({
  // Secrets requis en production : aucune valeur par défaut (correctif H2).
  // Optionnels au parse pour ne pas casser le build ; l'absence est contrôlée ci-dessous.
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(1).optional(),
  AUTH_URL: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  // Inscription : liste blanche de domaines e-mail autorisés (CSV). Absent ⇒ tout autorisé (dev).
  ALLOWED_EMAIL_DOMAINS: z.string().optional(),
  // Stockage S3-compatible (pièces jointes) - optionnel : la fonctionnalité se
  // désactive proprement si non configuré.
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
  // Notifications par e-mail (Mailjet) - optionnel : desactive proprement si absent.
  MAILJET_API_KEY: z.string().optional(),
  MAILJET_API_SECRET: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  EMAIL_FROM_NAME: z.string().optional(),
  MAILJET_API_URL: z.string().optional(),
  // URL publique de l'application (liens dans les e-mails).
  APP_URL: z.string().optional(),
  // Integration IA (Mistral) - optionnel : la generation de tickets depuis un
  // texte colle se desactive proprement si la cle est absente. Lue cote serveur
  // uniquement, jamais exposee au client. Modele par defaut : mistral-medium-3.5.
  // Traitement par lot (Batch API) actif par defaut ; MISTRAL_USE_BATCH="false"
  // bascule sur l'appel synchrone.
  MISTRAL_API_KEY: z.string().optional(),
  MISTRAL_MODEL: z.string().optional(),
  MISTRAL_USE_BATCH: z.string().optional(),
  MISTRAL_BATCH_TIMEOUT_MS: z.string().optional(),
  MISTRAL_API_URL: z.string().optional(),
  // Plafond de dépense IA quotidien, en USD (ex. "0.30"). Absent = pas de plafond.
  // Tarifs par million de tokens (défauts mistral-medium-3.5, à ajuster si besoin).
  // Voir src/lib/ai-budget.ts.
  AI_DAILY_BUDGET_USD: z.string().optional(),
  MISTRAL_INPUT_PRICE_PER_MTOK_USD: z.string().optional(),
  MISTRAL_OUTPUT_PRICE_PER_MTOK_USD: z.string().optional(),
  // Mode démo : bannière + identifiants de démo affichés dans l'UI (login + shell app).
  DEMO_MODE: z.string().optional(),
  // Mots de passe des comptes d'amorçage. Absents = engendrés au hasard hors
  // production, refus en production (cf. `resolveSeedPassword`). En mode démo,
  // ce sont eux que la carte de connexion affiche.
  SEED_ADMIN_PASSWORD: z.string().optional(),
  SEED_REPORTER_PASSWORD: z.string().optional(),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // On n'échoue pas le build ; on signale les variables invalides.
  console.warn("[env] Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});

/**
 * Correctif H2 - les secrets doivent être présents à l'exécution en production.
 * Au build, ils sont fournis via des placeholders : pas de throw parasite.
 * En développement, un avertissement suffit (secrets facultatifs en local).
 */
/** Valeur d'attente écrite dans le Dockerfile, et donc publique. */
const SECRET_PLACEHOLDER = "build-placeholder-secret-override-at-runtime";

if (process.env.NODE_ENV === "production") {
  if (!env.AUTH_SECRET || !env.DATABASE_URL) {
    throw new Error(
      "Variable d'environnement requise manquante en production : AUTH_SECRET / DATABASE_URL",
    );
  }
  /**
   * PRÉSENCE NE VAUT PAS SOLIDITÉ.
   *
   * Le contrôle ne portait que sur l'existence : un secret d'un caractère, ou
   * l'exemple recopié du Dockerfile - lisible de tous, le dépôt étant public -
   * passait sans un mot. Or ce secret signe le jeton de session, lequel PORTE
   * le rôle : le deviner, c'est se forger une session d'administrateur sans
   * jamais toucher à un mot de passe.
   *
   * Trente-deux caractères, soit ce que produit `openssl rand -base64 32`, la
   * commande que la documentation donne déjà.
   */
  if (env.AUTH_SECRET === SECRET_PLACEHOLDER) {
    throw new Error(
      "AUTH_SECRET est la valeur d'attente du Dockerfile, publique : fournissez un vrai secret au runtime (openssl rand -base64 32).",
    );
  }
  if (env.AUTH_SECRET.length < 32) {
    throw new Error(
      "AUTH_SECRET trop court (32 caractères minimum) : il signe le jeton de session, qui porte le rôle.",
    );
  }
} else if (!env.AUTH_SECRET || !env.DATABASE_URL) {
  console.warn(
    "[env] AUTH_SECRET ou DATABASE_URL manquant - toléré en développement uniquement.",
  );
}
