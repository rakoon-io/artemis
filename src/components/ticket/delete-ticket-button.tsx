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
import { fmt } from "@/i18n";
import { useDict } from "@/i18n/provider";

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
  const t = useDict();
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
    toast.success(fmt(t.ticketDetail.deleteSuccess, { key: ticketKey }));
    setOpen(false);
    router.push(`/projects/${projectKey}/tickets`);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !submitting && setOpen(next)}>
      <DialogTrigger asChild>
        <Button variant="destructive">
          <Trash2 />
          {t.common.delete}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t.ticketDetail.deleteTitle}</DialogTitle>
          <DialogDescription>
            {fmt(t.ticketDetail.deleteDescription, { key: ticketKey })}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={submitting}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={submitting}
          >
            {submitting && <Loader2 className="animate-spin" />}
            {t.ticketDetail.deleteConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
