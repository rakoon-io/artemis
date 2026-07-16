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
if (process.env.NODE_ENV === "production") {
  if (!env.AUTH_SECRET || !env.DATABASE_URL) {
    throw new Error(
      "Variable d'environnement requise manquante en production : AUTH_SECRET / DATABASE_URL",
    );
  }
} else if (!env.AUTH_SECRET || !env.DATABASE_URL) {
  console.warn(
    "[env] AUTH_SECRET ou DATABASE_URL manquant - toléré en développement uniquement.",
  );
}
