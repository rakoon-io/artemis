"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, X } from "lucide-react";
import type { ComponentKind } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COMPONENT_KIND_ICONS } from "@/components/ticket/ticket-fields";
import {
  approveModuleAction,
  rejectModuleAction,
} from "@/server/actions/module.actions";
import {
  approveComponentAction,
  rejectComponentAction,
} from "@/server/actions/component.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * File de validation des propositions (Admin). Modules et composants y sont
 * mêlés, dans l'ordre d'arrivée : c'est une file de travail, pas un catalogue -
 * les séparer obligerait à balayer deux listes pour un même geste.
 *
 * Valider rend la brique utilisable partout ; refuser la SUPPRIME. Comme une
 * proposition n'est jamais sélectionnable avant validation, aucun ticket ne peut
 * la référencer : le refus ne laisse donc pas d'orphelin.
 */

export interface PendingProposal {
  id: string;
  entity: "module" | "component";
  name: string;
  description: string | null;
  /** Renseigné pour un composant uniquement. */
  kind?: ComponentKind;
  /** Module de rattachement d'un composant proposé, le cas échéant. */
  moduleName?: string | null;
  proposedBy: string | null;
}

export function ProposalQueue({ proposals }: { proposals: PendingProposal[] }) {
  const router = useRouter();
  const t = useDict();
  const [busyId, setBusyId] = useState<string | null>(null);

  if (proposals.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        {t.structure.pendingEmpty}
      </p>
    );
  }

  async function run(
    proposal: PendingProposal,
    action: "approve" | "reject",
  ): Promise<void> {
    setBusyId(proposal.id);
    const isModule = proposal.entity === "module";
    const res =
      action === "approve"
        ? isModule
          ? await approveModuleAction(proposal.id)
          : await approveComponentAction(proposal.id)
        : isModule
          ? await rejectModuleAction(proposal.id)
          : await rejectComponentAction(proposal.id);
    setBusyId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      fmt(
        action === "approve" ? t.structure.approved : t.structure.rejected,
        { name: proposal.name },
      ),
    );
    router.refresh();
  }

  return (
    <ul className="space-y-2">
      {proposals.map((proposal) => {
        const Icon =
          proposal.entity === "component" && proposal.kind
            ? COMPONENT_KIND_ICONS[proposal.kind]
            : null;
        const busy = busyId === proposal.id;
        return (
          <li
            key={`${proposal.entity}-${proposal.id}`}
            className="flex items-start gap-3 rounded-lg border p-3"
          >
            {Icon && (
              <Icon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
            )}
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {proposal.name}
                <Badge variant="secondary">{t.structure.pendingBadge}</Badge>
                <span className="text-xs font-normal text-muted-foreground">
                  {proposal.entity === "module"
                    ? t.structure.modulesHeading
                    : proposal.kind
                      ? t.taxonomy.componentKinds[proposal.kind]
                      : t.structure.componentsHeading}
                  {proposal.moduleName ? ` · ${proposal.moduleName}` : ""}
                </span>
              </p>
              {proposal.description && (
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {proposal.description}
                </p>
              )}
              {proposal.proposedBy && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {fmt(t.structure.proposedBy, { name: proposal.proposedBy })}
                </p>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busy}
                aria-label={fmt(t.structure.approveAria, { name: proposal.name })}
                onClick={() => void run(proposal, "approve")}
              >
                {busy ? <Loader2 className="animate-spin" /> : <Check />}
                {t.structure.approve}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive"
                disabled={busy}
                title={t.structure.rejectHint}
                aria-label={fmt(t.structure.rejectAria, { name: proposal.name })}
                onClick={() => void run(proposal, "reject")}
              >
                <X />
                {t.structure.reject}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
