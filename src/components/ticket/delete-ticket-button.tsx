"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { deleteTicketAction } from "@/server/actions/ticket.actions";

/** Suppression d'un ticket (réservée à l'Admin ; confirmation obligatoire). */
export function DeleteTicketButton({
  ticketId,
  ticketKey,
  projectKey,
}: {
  ticketId: string;
  ticketKey: string;
  projectKey: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    const result = await deleteTicketAction(ticketId);
    if (!result.ok) {
      toast.error(result.error);
      setSubmitting(false);
      return;
    }
    toast.success(`Ticket ${ticketKey} supprimé.`);
    setOpen(false);
    router.push(`/projects/${projectKey}/tickets`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          Supprimer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Supprimer ce ticket ?</DialogTitle>
          <DialogDescription>
            Le ticket {ticketKey} et ses commentaires/pièces jointes seront
            définitivement supprimés. Cette action est irréversible.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              Annuler
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            Supprimer définitivement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
