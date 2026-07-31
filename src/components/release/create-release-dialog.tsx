"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createReleaseAction } from "@/server/actions/release.actions";
import { useDict } from "@/i18n/provider";

/**
 * Création d'une VERSION. Le nom suffit : on crée une version dès qu'on sait
 * qu'elle existera, souvent avant d'en connaître la date - et tout se complète
 * ensuite en place, sur la carte.
 */
export function CreateReleaseDialog({ projectId }: { projectId: string }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");

  async function submit() {
    if (!name.trim() || pending) return;
    setPending(true);
    const res = await createReleaseAction({
      projectId,
      name: name.trim(),
      description: description.trim() || null,
      dueDate: dueDate || null,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.releases.created);
    setName("");
    setDescription("");
    setDueDate("");
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button">
          <Plus />
          {t.releases.create}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.releases.createTitle}</DialogTitle>
          <DialogDescription>{t.releases.createDescription}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="release-name">{t.releases.nameLabel}</Label>
            <Input
              id="release-name"
              autoFocus
              value={name}
              maxLength={60}
              onChange={(event) => setName(event.target.value)}
              placeholder={t.releases.namePlaceholder}
              disabled={pending}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void submit();
                }
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="release-due">{t.releases.dueDateLabel}</Label>
            <Input
              id="release-due"
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
              disabled={pending}
              className="w-48"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="release-notes">{t.releases.descriptionLabel}</Label>
            <Textarea
              id="release-notes"
              value={description}
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t.releases.descriptionPlaceholder}
              disabled={pending}
              rows={4}
            />
          </div>
        </div>

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={pending || !name.trim()}
            onClick={() => void submit()}
          >
            {pending && <Loader2 className="animate-spin" />}
            {t.common.create}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
