/**
 * Limiteur de débit en mémoire (fenêtre fixe) - correctif M1 de l'audit.
 *
 * Le store est porté par `globalThis` (comme le client Prisma) pour être **partagé**
 * entre toutes les routes et évaluations de module d'un même process Node - sinon
 * chaque route bundle sa propre copie du `Map` et le compteur ne s'accumule pas.
 * Mono-instance : suffisant pour un déploiement Dokploy à une réplique derrière Traefik.
 * (Pour du multi-instance, remplacer le store par Redis/Upstash.)
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const globalForRateLimit = globalThis as unknown as {
  __rakoonRateLimitStore?: Map<string, Bucket>;
  __rakoonRateLimitSweep?: boolean;
};

const store: Map<string, Bucket> =
  globalForRateLimit.__rakoonRateLimitStore ?? new Map<string, Bucket>();
globalForRateLimit.__rakoonRateLimitStore = store;

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
}

/** Autorise au plus `limit` requêtes par fenêtre de `windowMs` pour une `key`. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSec: 0 };
  }

  if (bucket.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }

  bucket.count += 1;
  return { ok: true, remaining: limit - bucket.count, retryAfterSec: 0 };
}

/** Purge opportuniste des entrées expirées (évite une croissance non bornée). */
function sweep(): void {
  const now = Date.now();
  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }
}

if (typeof setInterval !== "undefined" && !globalForRateLimit.__rakoonRateLimitSweep) {
  globalForRateLimit.__rakoonRateLimitSweep = true;
  const timer = setInterval(sweep, 60_000);
  // N'empêche pas le process Node de se terminer.
  (timer as unknown as { unref?: () => void }).unref?.();
}

/** IP client best-effort à partir des en-têtes (derrière le proxy Traefik). */
export function clientIp(headers: Headers): string {
  const xff = headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";
  return headers.get("x-real-ip") ?? "unknown";
}
