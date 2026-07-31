"use client";

import { type FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BookLock, Loader2, Trash2, Upload } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import { formatDateTime } from "@/lib/utils";
import { formatVersionLabel } from "@/lib/spec-package";
import {
  deleteSpecVersionAction,
  markPageAsSpecAction,
  publishSpecVersionAction,
  unmarkSpecAction,
} from "@/server/actions/spec.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * Commandes d'un PAQUET DE SPÉCIFICATIONS, sur la page racine du paquet.
 *
 * Le partage des droits reproduit celui du serveur, qui seul fait foi :
 *  - déclarer / retirer une spécification, supprimer une version : Admin ;
 *  - publier une version : tout membre du projet, comme écrire une page.
 *
 * Une version publiée n'a délibérément aucun bouton « modifier ». C'est ce qui
 * fait sa valeur : un ticket peut citer « la spécification v2 » et la phrase
 * garde le même sens six mois plus tard. Corriger, c'est publier la suivante.
 */

export interface SpecVersionItem {
  id: string;
  number: number;
  label: string | null;
  note: string | null;
  createdAt: Date | string;
  publishedBy: { name: string | null; email: string } | null;
  pageCount: number;
}

/** Déclare une page comme racine de spécification (Admin). */
export function MarkSpecButton({
  projectId,
  pageId,
  pageTitle,
}: {
  projectId: string;
  pageId: string;
  pageTitle: string;
}) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  async function run() {
    setPending(true);
    const res = await markPageAsSpecAction({ projectId, rootPageId: pageId });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(fmt(t.wiki.specs.marked, { title: pageTitle }));
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          <BookLock />
          {t.wiki.specs.mark}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {fmt(t.wiki.specs.markTitle, { title: pageTitle })}
          </DialogTitle>
          <DialogDescription>{t.wiki.specs.markDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button type="button" onClick={() => void run()} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            {t.wiki.specs.mark}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function SpecPanel({
  packageId,
  rootTitle,
  versions,
  projectKey,
  isAdmin,
}: {
  packageId: string;
  rootTitle: string;
  versions: SpecVersionItem[];
  projectKey: string;
  isAdmin: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [publishOpen, setPublishOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [busyVersionId, setBusyVersionId] = useState<string | null>(null);

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setPending(true);
    const res = await publishSpecVersionAction({
      packageId,
      label: String(data.get("label") ?? ""),
      note: String(data.get("note") ?? ""),
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(
      fmt(t.wiki.specs.published, {
        label: formatVersionLabel(res.data?.number ?? 0),
      }),
    );
    setPublishOpen(false);
    router.refresh();
  }

  async function removeVersion(version: SpecVersionItem) {
    setBusyVersionId(version.id);
    const res = await deleteSpecVersionAction(version.id);
    setBusyVersionId(null);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.specs.versionDeleted);
    router.refresh();
  }

  async function unmark() {
    setPending(true);
    const res = await unmarkSpecAction(packageId);
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.specs.unmarked);
    router.refresh();
  }

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-sm font-medium">
          <BookLock className="size-4 text-muted-foreground" aria-hidden />
          {t.wiki.specs.versionsTitle}
        </p>
        <div className="flex items-center gap-2">
          <Dialog
            open={publishOpen}
            onOpenChange={(next) => !pending && setPublishOpen(next)}
          >
            <DialogTrigger asChild>
              <Button type="button" size="sm">
                <Upload />
                {t.wiki.specs.publish}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t.wiki.specs.publish}</DialogTitle>
                <DialogDescription>
                  {t.wiki.specs.publishDescription}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={publish} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="spec-label">{t.wiki.specs.labelLabel}</Label>
                  <Input
                    id="spec-label"
                    name="label"
                    maxLength={60}
                    placeholder={t.wiki.specs.labelPlaceholder}
                    autoFocus
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="spec-note">{t.wiki.specs.noteLabel}</Label>
                  <Textarea
                    id="spec-note"
                    name="note"
                    rows={3}
                    maxLength={2000}
                    placeholder={t.wiki.specs.notePlaceholder}
                  />
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={pending}>
                      {t.common.cancel}
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={pending}>
                    {pending && <Loader2 className="animate-spin" />}
                    {t.wiki.specs.publishSubmit}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>

          {/* Le retrait n'apparaît que s'il est réellement possible : proposer un
              bouton qui répondrait toujours « refusé » vaut moins que pas de
              bouton. Le serveur refuse de toute façon (cf. `unmarkSpec`). */}
          {isAdmin && versions.length === 0 && (
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground hover:text-destructive"
                >
                  {t.wiki.specs.unmark}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {fmt(t.wiki.specs.unmarkTitle, { title: rootTitle })}
                  </DialogTitle>
                  <DialogDescription>
                    {t.wiki.specs.unmarkDescription}
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" disabled={pending}>
                      {t.common.cancel}
                    </Button>
                  </DialogClose>
                  <Button
                    type="button"
                    variant="destructive"
                    onClick={() => void unmark()}
                    disabled={pending}
                  >
                    {pending && <Loader2 className="animate-spin" />}
                    {t.wiki.specs.unmark}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {versions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {t.wiki.specs.versionsEmpty}
        </p>
      ) : (
        <ul className="space-y-2">
          {versions.map((version) => {
            const label = formatVersionLabel(version.number, version.label);
            const author =
              version.publishedBy?.name ?? version.publishedBy?.email ?? null;
            return (
              <li
                key={version.id}
                className="flex flex-wrap items-start gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-medium">
                    {label}
                    <Badge variant="secondary">
                      {version.pageCount}{" "}
                      {version.pageCount > 1
                        ? t.wiki.specs.pageOther
                        : t.wiki.specs.pageOne}
                    </Badge>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(version.createdAt)}
                    {author
                      ? ` — ${fmt(t.wiki.specs.publishedBy, { name: author })}`
                      : ""}
                  </p>
                  {version.note && (
                    <p className="text-sm text-muted-foreground">
                      {version.note}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button asChild variant="outline" size="sm">
                    <Link
                      href={`/projects/${projectKey}/wiki?spec=${version.id}`}
                    >
                      {t.wiki.specs.read}
                    </Link>
                  </Button>
                  {isAdmin && (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={fmt(t.wiki.specs.deleteVersion, { label })}
                          disabled={busyVersionId === version.id}
                        >
                          {busyVersionId === version.id ? (
                            <Loader2 className="animate-spin" />
                          ) : (
                            <Trash2 />
                          )}
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>
                            {fmt(t.wiki.specs.deleteVersionTitle, { label })}
                          </DialogTitle>
                          <DialogDescription>
                            {t.wiki.specs.deleteVersionDescription}
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="outline">
                              {t.common.cancel}
                            </Button>
                          </DialogClose>
                          <Button
                            type="button"
                            variant="destructive"
                            onClick={() => void removeVersion(version)}
                          >
                            {t.common.delete}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
