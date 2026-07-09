import { z } from "zod";

/**
 * Validation des variables d'environnement (voir .ai/rules.md : « env validées via Zod »).
 * On utilise `safeParse` pour ne pas casser le build quand les variables ne sont pas
 * présentes (le rendu des pages qui touchent la DB est dynamique, pas prérendu au build).
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1).default("postgresql://placeholder@localhost:5432/placeholder"),
  AUTH_SECRET: z.string().min(1).default("dev-insecure-secret-change-me"),
  AUTH_URL: z.string().optional(),
  AUTH_TRUST_HOST: z.string().optional(),
  // Stockage S3-compatible (pièces jointes) — optionnel : la fonctionnalité se
  // désactive proprement si non configuré.
  S3_ENDPOINT: z.string().optional(),
  S3_BUCKET: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_REGION: z.string().default("us-east-1"),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  // On n'échoue pas le build ; on signale les variables invalides.
  console.warn("[env] Variables d'environnement invalides :", parsed.error.flatten().fieldErrors);
}

export const env = parsed.success ? parsed.data : schema.parse({});
