"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useDict } from "@/i18n/provider";

/**
 * Ce qu'il faut savoir d'un ticket cité sans quitter la page : de quoi il parle,
 * et qui s'en occupe.
 */
export interface TicketHint {
  key: string;
  title: string;
  /** Nom (ou e-mail) de l'assigné ; `null` si le ticket n'est pris par personne. */
  assignee: string | null;
}

/**
 * Lien vers un ticket cité (« RKN-123 ») doublé d'une INFOBULLE au survol.
 *
 * Une clef de ticket ne dit rien par elle-même : au fil d'un compte rendu ou
 * d'une spécification, « cf. RKN-2 » oblige à ouvrir un onglet pour savoir de
 * quoi il retourne. L'infobulle rend cette information sans quitter la lecture,
 * et le lien reste un lien - on peut toujours cliquer.
 *
 * Le survol est un CONFORT, pas le seul chemin : Radix montre aussi l'infobulle
 * au focus clavier, et le texte du lien porte déjà la clef pour qui n'a ni l'un
 * ni l'autre.
 */
export function TicketHoverLink({
  href,
  hint,
  children,
}: {
  href: string;
  hint: TicketHint;
  children: ReactNode;
}) {
  const t = useDict();
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href}>{children}</Link>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <p className="font-mono text-xs opacity-80">{hint.key}</p>
          <p className="font-medium">{hint.title}</p>
          {/* Sans assigné, on affiche « Non assigné » SEUL : « Assigné à :
              Non assigné » se lit comme une faute. */}
          <p className="mt-0.5 text-xs opacity-80">
            {hint.assignee
              ? `${t.ticketDetail.assignee} : ${hint.assignee}`
              : t.ticketDetail.unassigned}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
