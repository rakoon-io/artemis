"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Loader2, Pencil, Wrench } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  markWikiPageReviewedAction,
  setWikiPageSubjectsAction,
} from "@/server/actions/wiki.actions";
import { freshnessOf, type Freshness } from "@/lib/wiki-freshness";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";
import { formatDate } from "@/lib/utils";

/**
 * CE QUE LA PAGE DOCUMENTE, et DEPUIS QUAND ON L'A VUE.
 *
 * Ces deux renseignements ne valent que pour la section Implémentation, et
 * c'est la raison d'être des sections : une spécification vit en versions
 * figées, un compte rendu est daté et ne vieillit pas. Seule la documentation
 * technique peut devenir fausse en silence, et seule elle gagne à dire de quelle
 * partie du système elle parle.
 *
 * Déclarer un sujet fait plus que décorer la page : c'est ce qui permet, depuis
 * un module ou depuis un ticket, de retrouver ce qui en est écrit. Le wiki cesse
 * d'être un tas de documents pour devenir un index du système.
 */

interface Named {
  id: string;
  name: string;
  color: string;
}

const FRESHNESS_STYLE: Record<Freshness, string> = {
  fresh: "border-transparent bg-secondary text-secondary-foreground",
  ageing: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  stale:
    "border-destructive/40 bg-destructive/10 text-destructive dark:text-red-300",
};

export function PageSubjects({
  pageId,
  modules,
  components,
  selectedModuleIds,
  selectedComponentIds,
  updatedAt,
  reviewedAt,
  canEdit,
}: {
  pageId: string;
  /** Catalogue du projet - seuls les éléments validés y figurent. */
  modules: Named[];
  components: Array<Named & { moduleId: string | null }>;
  selectedModuleIds: string[];
  selectedComponentIds: string[];
  updatedAt: string;
  reviewedAt: string | null;
  canEdit: boolean;
}) {
  const t = useDict();
  const router = useRouter();
  const [reviewing, setReviewing] = useState(false);

  const chosenModules = modules.filter((m) => selectedModuleIds.includes(m.id));
  const chosenComponents = components.filter((c) =>
    selectedComponentIds.includes(c.id),
  );
  const nothing = chosenModules.length === 0 && chosenComponents.length === 0;

  // `new Date()` au rendu : la fraîcheur est relative à MAINTENANT, et une page
  // rendue côté serveur puis hydratée doit s'accorder à quelques millisecondes
  // près - les seuils étant en jours, aucun écart visible n'en résulte.
  const level = freshnessOf({ updatedAt, reviewedAt }, new Date());
  const checked = reviewedAt ?? updatedAt;

  async function review() {
    setReviewing(true);
    const res = await markWikiPageReviewedAction(pageId);
    setReviewing(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.subjects.reviewed);
    router.refresh();
  }

  /**
   * La DATE n'est dite que s'il y a eu une RELECTURE DÉCLARÉE - le seul cas où
   * elle apprend quelque chose. Sans relecture, la date de vérification est
   * celle de la dernière modification, déjà écrite deux lignes plus haut : la
   * répéter n'ajouterait qu'une ligne à lire. Le badge, lui, suffit à alerter.
   */
  const alerting = level === "ageing" || level === "stale";
  const showDate = Boolean(reviewedAt);

  return (
    /* UNE LIGNE, pas un encart.
       Ces renseignements sont des MÉTADONNÉES de la page - au même titre que
       son auteur et sa date -, pas une section de son contenu. Encadrés,
       titrés et pourvus de deux boutons, ils occupaient le haut de l'écran et
       repoussaient plus bas le texte qu'on venait lire.
       Les commandes ne se montrent qu'au survol ou au focus : modifier les
       sujets et déclarer une relecture sont des gestes rares. */
    <div className="group/subjects flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
      <Wrench className="size-3.5 shrink-0" aria-hidden />

      {nothing ? (
        <span title={t.wiki.subjects.emptyHint}>{t.wiki.subjects.empty}</span>
      ) : (
        <span className="flex flex-wrap items-center gap-1.5">
          {[...chosenModules, ...chosenComponents].map((entry) => (
            <span
              key={entry.id}
              className="inline-flex items-center gap-1.5 rounded-md border px-1.5 py-0.5 text-foreground"
            >
              <span
                className="size-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: entry.color }}
                aria-hidden
              />
              {entry.name}
            </span>
          ))}
        </span>
      )}

      {/* Le badge de fraîcheur ne paraît QUE s'il alerte. « À jour » sur chaque
          page apprendrait à ne plus lire les badges - même règle que dans les
          listes de documentation. */}
      {alerting && (
        <Badge
          variant="outline"
          className={cn("font-normal", FRESHNESS_STYLE[level])}
        >
          {t.wiki.subjects.freshness[level]}
        </Badge>
      )}
      {showDate && (
        <span>
          ·{" "}
          {fmt(t.wiki.subjects.reviewedOn, { date: formatDate(checked) })}
        </span>
      )}

      {canEdit && (
        <span className="flex shrink-0 items-center opacity-0 transition-opacity group-hover/subjects:opacity-100 group-focus-within/subjects:opacity-100 pointer-coarse:opacity-100">
          <SubjectsDialog
            pageId={pageId}
            modules={modules}
            components={components}
            selectedModuleIds={selectedModuleIds}
            selectedComponentIds={selectedComponentIds}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            disabled={reviewing}
            onClick={() => void review()}
            title={t.wiki.subjects.review}
            aria-label={t.wiki.subjects.review}
          >
            {reviewing ? (
              <Loader2 className="animate-spin" />
            ) : (
              <CheckCircle2 />
            )}
          </Button>
        </span>
      )}
    </div>
  );
}

/**
 * Choix des sujets. Cases à cocher plutôt qu'une liste déroulante à sélection
 * multiple : on voit tout le catalogue d'un coup, et l'on coche - le geste
 * naturel pour « de quoi parle cette page ».
 *
 * Le formulaire envoie l'ÉTAT VOULU, pas un différentiel : le service remplace
 * intégralement. Deux personnes qui éditent la même page ne se défont donc pas
 * l'une l'autre à moitié.
 */
function SubjectsDialog({
  pageId,
  modules,
  components,
  selectedModuleIds,
  selectedComponentIds,
}: {
  pageId: string;
  modules: Named[];
  components: Array<Named & { moduleId: string | null }>;
  selectedModuleIds: string[];
  selectedComponentIds: string[];
}) {
  const t = useDict();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [pickedModules, setPickedModules] = useState(selectedModuleIds);
  const [pickedComponents, setPickedComponents] = useState(selectedComponentIds);

  function toggle(list: string[], id: string) {
    return list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
  }

  async function save() {
    setPending(true);
    const res = await setWikiPageSubjectsAction({
      pageId,
      moduleIds: pickedModules,
      componentIds: pickedComponents,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.subjects.saved);
    setOpen(false);
    router.refresh();
  }

  const empty = modules.length === 0 && components.length === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return;
        // Rouvrir doit repartir de ce qui est ENREGISTRÉ, pas des cases laissées
        // cochées lors d'un abandon précédent.
        if (next) {
          setPickedModules(selectedModuleIds);
          setPickedComponents(selectedComponentIds);
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-7 text-muted-foreground"
          title={t.wiki.subjects.edit}
          aria-label={t.wiki.subjects.edit}
        >
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t.wiki.subjects.dialogTitle}</DialogTitle>
          <DialogDescription>{t.wiki.subjects.dialogDescription}</DialogDescription>
        </DialogHeader>

        {empty ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {t.wiki.subjects.catalogueEmpty}
          </p>
        ) : (
          <div className="max-h-96 space-y-4 overflow-y-auto pr-1">
            {modules.length > 0 && (
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.wiki.subjects.modules}
                </legend>
                {modules.map((m) => (
                  <Check
                    key={m.id}
                    label={m.name}
                    color={m.color}
                    checked={pickedModules.includes(m.id)}
                    disabled={pending}
                    onChange={() => setPickedModules((prev) => toggle(prev, m.id))}
                  />
                ))}
              </fieldset>
            )}
            {components.length > 0 && (
              <fieldset className="space-y-1.5">
                <legend className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {t.wiki.subjects.components}
                </legend>
                {components.map((c) => (
                  <Check
                    key={c.id}
                    label={c.name}
                    color={c.color}
                    checked={pickedComponents.includes(c.id)}
                    disabled={pending}
                    onChange={() =>
                      setPickedComponents((prev) => toggle(prev, c.id))
                    }
                  />
                ))}
              </fieldset>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={pending}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button type="button" disabled={pending || empty} onClick={() => void save()}>
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Check({
  label,
  color,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  color: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent/50">
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="size-4 shrink-0 accent-primary"
      />
      <span
        className="size-2 shrink-0 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="min-w-0 flex-1 truncate">{label}</span>
    </label>
  );
}
