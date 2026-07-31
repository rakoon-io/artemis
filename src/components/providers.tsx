"use client";

import { useState, type ReactNode } from "react";
import { ThemeProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { THEME_IDS } from "@/lib/themes";

/**
 * Fournisseurs globaux de l'application (côté client) :
 * thème clair/sombre, session Auth.js, cache de requêtes et notifications.
 */
export function Providers({
  children,
  /**
   * Jeton de la politique de sécurité du contenu, tiré par le middleware.
   *
   * `next-themes` écrit un script EN LIGNE pour poser la classe de thème avant
   * le premier rendu ; sans jeton, la politique le refuse et la page s'affiche
   * en clair une fraction de seconde avant de basculer.
   */
  nonce,
}: {
  children: ReactNode;
  nonce?: string;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      themes={THEME_IDS}
      nonce={nonce}
    >
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
