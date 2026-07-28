"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateTicketAction } from "@/server/actions/ticket.actions";
import { InlineEdit } from "@/components/ui/inline-edit";
import { useDict } from "@/i18n/provider";

/**
 * Adaptateurs CLIENT entre la page de détail (composant serveur) et la primitive
 * `InlineEdit`.
 *
 * Raison d'être : une page serveur ne peut pas transmettre une fonction en prop
 * à un composant client. Ces enveloppes minces portent donc l'appel à la Server
 * Action et le rafraîchissement, et n'exposent au parent que des données sérialisables.
 *
 * L'autorisation reste imposée côté serveur par `updateTicketAction` : `canEdit`
 * ne fait que masquer l'affordance (« l'UI masque, le serveur impose »).
 */

/** Titre du ticket, éditable en place. Obligatoire, une seule ligne. */
export function TicketTitleInline({
  ticketId,
  value,
  canEdit,
}: {
  ticketId: string;
  value: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useDict();

  return (
    <InlineEdit
      value={value}
      field={t.ticketForm.titleLabel}
      required
      maxLength={200}
      disabled={!canEdit}
      className="text-2xl font-semibold tracking-tight"
      onSave={async (next) => {
        const res = await updateTicketAction({ id: ticketId, title: next });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(t.common.inline.saved);
        router.refresh();
        return true;
      }}
    />
  );
}

/** Description du ticket, éditable en place. Facultative, multiligne. */
export function TicketDescriptionInline({
  ticketId,
  value,
  canEdit,
}: {
  ticketId: string;
  value: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const t = useDict();

  return (
    <InlineEdit
      value={value ?? ""}
      field={t.ticketForm.descriptionLabel}
      multiline
      rows={6}
      maxLength={20000}
      disabled={!canEdit}
      emptyLabel={t.ticketDetail.noDescription}
      className="whitespace-pre-wrap break-words text-sm"
      onSave={async (next) => {
        const res = await updateTicketAction({
          id: ticketId,
          // Une description vidée redevient `null` en base, comme dans le
          // dialogue d'édition - et non une chaîne vide.
          description: next ? next : null,
        });
        if (!res.ok) {
          toast.error(res.error);
          return false;
        }
        toast.success(t.common.inline.saved);
        router.refresh();
        return true;
      }}
    />
  );
}
