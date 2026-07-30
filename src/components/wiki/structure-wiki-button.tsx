"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LayoutList, Loader2 } from "lucide-react";
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
import { ensureWikiSectionsAction } from "@/server/actions/wiki.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * Donne ses SECTIONS à un wiki qui n'en a pas - le cas des projets antérieurs.
 *
 * L'opération crée les trois pages racines manquantes, puis range dessous ce
 * qui est identifiable SANS DEVINER : les pages datées sont des comptes rendus,
 * les racines de paquets sont des spécifications. Rien d'autre n'est déplacé, et
 * surtout pas au titre d'une ressemblance : une page rangée d'office au mauvais
 * endroit coûte plus cher à retrouver qu'une page restée à sa place.
 *
 * Rien n'est supprimé ni réécrit. Ce qui est déplacé peut être redéplacé - une
 * page de wiki se reparente, c'est tout ce que fait cette action.
 */
export function StructureWikiButton({ projectId }: { projectId: string }) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const res = await ensureWikiSectionsAction(projectId);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.wiki.sections.done, { count: res.data?.filed ?? 0 }));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" className="w-full">
          <LayoutList />
          {t.wiki.sections.structure}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.wiki.sections.structureTitle}</DialogTitle>
          <DialogDescription>
            {t.wiki.sections.structureDescription}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-1 text-sm text-muted-foreground">
          <li>· {t.wiki.sections.structureSpec}</li>
          <li>· {t.wiki.sections.structureMeeting}</li>
          <li>· {t.wiki.sections.structureImplementation}</li>
        </ul>
        <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
          {t.wiki.sections.structureSafety}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button type="button" disabled={pending} onClick={() => void run()}>
            {pending && <Loader2 className="animate-spin" />}
            {t.wiki.sections.structureSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
