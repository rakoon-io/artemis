"use client";

import { AlertTriangle, Info, OctagonAlert } from "lucide-react";
import type { CalloutKind } from "@/lib/wiki-callouts";
import { useDict } from "@/i18n/provider";

/**
 * Intitulé d'un ENCART - « Note », « Attention », « Important ».
 *
 * Composant CLIENT rendu depuis `WikiContent`, qui sert aussi bien un arbre
 * serveur qu'un arbre client et ne peut donc pas lire le dictionnaire
 * lui-même. C'est exactement le procédé déjà employé pour l'infobulle d'un
 * ticket cité : la frontière est posée au plus petit fragment qui a besoin de
 * traduction, et non autour de tout le rendu.
 */
const ICONS: Record<CalloutKind, typeof Info> = {
  note: Info,
  warning: AlertTriangle,
  important: OctagonAlert,
};

export function CalloutTitle({ kind }: { kind: CalloutKind }) {
  const t = useDict();
  const Icon = ICONS[kind];
  return (
    <p className="wiki-callout-title">
      <Icon className="size-4 shrink-0" aria-hidden />
      {t.wiki.callouts[kind]}
    </p>
  );
}
