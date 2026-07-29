import type { ReactNode } from "react";
import { GithubLink } from "@/components/brand/github-link";
import { TrackerMark } from "@/components/brand/tracker-mark";
import { env } from "@/lib/env";

// Sans quoi ce layout est pré-rendu statiquement au build : `DEMO_MODE` serait
// figé à sa valeur de build (placeholders d'env Docker) au lieu de celle du
// runtime - même correctif que sur /login.
export const dynamic = "force-dynamic";

/** Layout des écrans d'authentification : carte centrée sur fond atténué. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  // Le lien vers le dépôt ne concerne que la démo publique : hors démo, cette
  // instance est un déploiement interne et n'a pas à pointer vers son code.
  const isDemo = env.DEMO_MODE === "true";
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4 py-12">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-center gap-2 text-lg font-semibold">
          <TrackerMark className="size-8 shrink-0 text-primary" />
          <span>Artemis</span>
        </div>
        {children}
        <p className="flex items-center justify-center gap-2 text-center text-xs text-muted-foreground">
          <span>Développé par Thomas Broussard</span>
          {isDemo && (
            <>
              {/* Le séparateur disparaît avec le lien : sans cela il resterait
                  un « · » orphelin en fin de ligne. */}
              <span aria-hidden>·</span>
              <GithubLink />
            </>
          )}
        </p>
      </div>
    </div>
  );
}
