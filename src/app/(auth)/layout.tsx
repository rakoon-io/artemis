import type { ReactNode } from "react";
import { BuildStamp } from "@/components/brand/build-stamp";
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
        {/* La version figure AUSSI avant la connexion : c'est là qu'on la
            demande à quelqu'un qui n'arrive pas à entrer, et c'est le seul écran
            qu'il puisse montrer. */}
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
          <span>Développé par Thomas Broussard</span>
          {isDemo && (
            <>
              {/* Le séparateur disparaît avec le lien : sans cela il resterait
                  un « · » orphelin en fin de ligne. */}
              <span aria-hidden>·</span>
              <GithubLink />
            </>
          )}
          <BuildStamp />
        </p>
      </div>
    </div>
  );
}
