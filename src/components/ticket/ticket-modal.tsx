"use client";

import type { ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Dialog, DialogContent } from "@/components/ui/dialog";

/**
 * FENÊTRE D'UN TICKET ouvert depuis la liste ou le tableau.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * FERMER, C'EST REVENIR
 *
 * La modale n'a pas d'état propre : elle EST l'adresse. Ouverte, l'URL est celle
 * du ticket - partageable, rechargeable, ouvrable dans un onglet, où elle donne
 * la page pleine. La fermer revient en arrière dans l'historique, ce qui rend la
 * page d'où l'on vient, filtres et défilement compris. C'est là tout le propos :
 * ne pas perdre le contexte.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * L'ADRESSE FAIT FOI
 *
 * Un créneau parallèle garde son dernier rendu quand la nouvelle adresse ne lui
 * correspond pas : quitter la modale par un onglet de navigation - « Tableau »,
 * « Wiki » - l'aurait laissée ouverte par-dessus la page suivante. On compare
 * donc l'adresse courante à celle du ticket : dès qu'elles diffèrent, il n'y a
 * plus de modale, quoi qu'en pense le routeur.
 */
export function TicketModal({
  href,
  children,
}: {
  /** Adresse du ticket : la modale n'existe que tant qu'on y est. */
  href: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <Dialog
      open={pathname === href}
      onOpenChange={(next) => {
        if (!next) router.back();
      }}
    >
      {/**
       * Large et défilante : une fiche de ticket porte une description, des
       * pièces jointes et une conversation - `max-w-lg` par défaut en aurait
       * fait une colonne de texte illisible. `p-0` parce que la fiche apporte
       * ses propres marges, les mêmes qu'en pleine page.
       */}
      <DialogContent className="max-h-[90dvh] w-[min(96vw,72rem)] max-w-none overflow-y-auto p-0">
        {children}
      </DialogContent>
    </Dialog>
  );
}
