"use client";

import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Ouvre la fenêtre d'impression du navigateur.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AU CLIC, ET NON AU CHARGEMENT
 *
 * Déclencher `window.print()` tout seul à l'arrivée sur la page est tentant -
 * un clic de moins. C'est écarté pour trois raisons :
 *
 * - la fenêtre s'ouvre AVANT que les images et les polices ne soient chargées,
 *   et le document part avec des blancs à leur place. Attendre `fonts.ready` et
 *   chaque `<img>` ferait retomber le gain à zéro, tout en ajoutant une course
 *   qu'on ne saurait pas déboguer ;
 * - la page EST la prévisualisation. On y voit ce qui sortira, on referme si ce
 *   n'est pas le bon document, et l'on n'a pas à fermer une boîte de dialogue
 *   surgie sans qu'on l'ait demandée ;
 * - revenir en arrière depuis l'historique rouvrirait la fenêtre à chaque fois.
 *
 * Le raccourci du navigateur (Ctrl/Cmd + P) marche de toute façon : ce bouton
 * est un rappel autant qu'une commande.
 */
export function PrintTrigger({ label }: { label: string }) {
  return (
    <Button size="sm" onClick={() => window.print()}>
      <Printer />
      {label}
    </Button>
  );
}
