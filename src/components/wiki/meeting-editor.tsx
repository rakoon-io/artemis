"use client";

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutoTextarea } from "@/components/ui/auto-textarea";
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
import { generateMeetingFromTextAction } from "@/server/actions/ai-meeting.actions";
import {
  formatItemRef,
  parseMeeting,
  serializeMeeting,
  themeLetter,
  type MeetingItemKind,
} from "@/lib/meeting-minutes";
import { updateWikiPageAction } from "@/server/actions/wiki.actions";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * ÉDITION GRAPHIQUE des points d'un compte rendu : on ajoute, déplace, qualifie
 * et supprime thèmes et points sans écrire une ligne de Markdown.
 *
 * Le compte rendu reste pourtant du Markdown : à l'enregistrement, l'éditeur
 * RÉÉCRIT toute la page (`serializeMeeting`). C'est ce qui permet de garder un
 * seul format de stockage - la page reste consultable, cherchable, versionnée et
 * modifiable à la main - au prix d'une exigence : la réécriture doit être fidèle.
 * D'où l'aller-retour vérifié par les tests du module, et la conservation
 * explicite du préambule et du texte libre de chaque thème.
 *
 * Les LETTRES et les RÉFÉRENCES ne sont jamais saisies : elles se recalculent à
 * chaque rendu depuis la position. Monter un thème renumérote donc tout, sous les
 * yeux de l'utilisateur, avant même d'enregistrer.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ÉDITER DOIT RESSEMBLER À LIRE
 *
 * Le principe qui gouverne la mise en forme : une même donnée porte le même
 * costume des deux côtés. La nature d'un point est une pastille en lecture,
 * elle reste une pastille en édition - de la même taille et de la même couleur,
 * simplement cliquable. L'ordre des colonnes est celui du tableau lu (référence,
 * nature, point), et les compteurs sont les mêmes.
 *
 * C'est ce qui évite deux écrans à apprendre au lieu d'un. Cela règle aussi une
 * hiérarchie fautive : la nature s'affichait en bouton pleine taille, du violet
 * exact d'« Enregistrer », si bien que trois faux boutons primaires écrasaient
 * le vrai.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * LA SAISIE AU CLAVIER EST LE CHEMIN NORMAL
 *
 * Un compte rendu s'écrit d'une traite. Entrée ouvre le point suivant,
 * Maj+Entrée reste dans le point courant, Alt+flèches déplace, et Retour arrière
 * sur un point vide le referme. La souris n'est plus requise que pour ce qui est
 * rare : changer une nature, supprimer un thème.
 */

interface DraftItem {
  kind: MeetingItemKind;
  text: string;
}

interface DraftTheme {
  title: string;
  items: DraftItem[];
  /** Texte libre du thème, conservé sans être montré (cf. `notesKept`). */
  notesBefore: string;
  notesAfter: string;
}

/** Compte rendu analysé -> brouillon éditable. */
function toDraft(parsed: ReturnType<typeof parseMeeting>): DraftTheme[] {
  return (
    parsed?.themes.map((theme) => ({
      title: theme.title,
      items: theme.items.map((item) => ({ kind: item.kind, text: item.text })),
      notesBefore: theme.notesBefore,
      notesAfter: theme.notesAfter,
    })) ?? []
  );
}

/**
 * Brouillon -> Markdown. Lettres et références sont posées ICI, depuis la seule
 * position : elles ne sont jamais portées par le brouillon, qui ne pourrait que
 * les laisser diverger de ce que l'écran affiche.
 */
function toMarkdown(preamble: string, themes: DraftTheme[], headingLevel: number) {
  return serializeMeeting({
    preamble,
    headingLevel,
    themes: themes.map((theme, index) => ({
      letter: themeLetter(index),
      title: theme.title,
      notesBefore: theme.notesBefore,
      notesAfter: theme.notesAfter,
      items: theme.items.map((item, position) => ({
        ref: formatItemRef(themeLetter(index), position + 1),
        kind: item.kind,
        text: item.text,
      })),
    })),
  });
}

/** Déplace un élément d'un cran ; renvoie une nouvelle liste. */
function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

/**
 * Commandes de ligne révélées au survol ou au focus. Trois boutons par point,
 * affichés en permanence, pesaient plus lourd que le texte qu'ils encadrent -
 * mais sur un écran tactile il n'y a pas de survol, d'où le maintien en clair
 * dès que le pointeur est grossier.
 */
const REVEAL =
  "flex shrink-0 items-center opacity-0 transition-opacity group-hover/row:opacity-100 group-focus-within/row:opacity-100 pointer-coarse:opacity-100";

export function MeetingEditor({
  pageId,
  pageTitle,
  parentId,
  content,
  aiEnabled = false,
  onDone,
}: {
  pageId: string;
  pageTitle: string;
  /**
   * Parent ACTUEL de la page. Indispensable : le schéma de mise à jour
   * normalise un parent absent en `null`, si bien qu'omettre ce champ
   * remonterait la page à la racine du wiki à chaque enregistrement.
   */
  parentId: string | null;
  content: string;
  /** L'IA est-elle configurée sur ce serveur ? Décidé côté serveur. */
  aiEnabled?: boolean;
  onDone: () => void;
}) {
  const t = useDict();
  const router = useRouter();
  const parsed = parseMeeting(content);

  const [preamble, setPreamble] = useState(parsed?.preamble ?? "");
  const [themes, setThemes] = useState<DraftTheme[]>(() => toDraft(parsed));
  const [pending, setPending] = useState(false);
  /**
   * Point à mettre au clavier après la prochaine peinture : « thème-point ».
   * Une référence et non un état - la cible ne se dessine pas, elle se consomme
   * une fois, et la remettre à zéro par `setState` depuis un effet relancerait
   * un rendu pour rien.
   */
  const focusNext = useRef<string | null>(null);

  // Une page sans thème s'édite aussi : c'est même le cas où l'éditeur sert le
  // plus, puisqu'il n'y a rien à recopier d'un exemple.
  const headingLevel = parsed?.headingLevel ?? 2;

  /**
   * Empreinte du brouillon À L'OUVERTURE, et non le Markdown reçu : la
   * réécriture peut normaliser une espace sans que rien n'ait été modifié, et
   * l'éditeur se croirait sale dès la première seconde.
   */
  const [pristine] = useState(() =>
    toMarkdown(parsed?.preamble ?? "", toDraft(parsed), headingLevel),
  );

  const markdown = toMarkdown(preamble, themes, headingLevel);
  const dirty = markdown !== pristine;

  const itemCount = themes.reduce((total, theme) => total + theme.items.length, 0);
  const actionCount = themes.reduce(
    (total, theme) =>
      total + theme.items.filter((item) => item.kind === "action").length,
    0,
  );

  /** Donne le clavier au point désigné, immédiatement, curseur en fin de texte. */
  function focusItem(key: string) {
    const field = document.querySelector<HTMLTextAreaElement>(
      `[data-meeting-item="${pageId}-${key}"]`,
    );
    if (!field) return;
    field.focus();
    const end = field.value.length;
    field.setSelectionRange(end, end);
  }

  // Le point qui vient de naître - ou celui qui vient de se déplacer - reçoit le
  // clavier. Sans cela, chaque « Entrée » renverrait la main à la souris, et le
  // chemin clavier ne servirait à rien.
  //
  // Sans tableau de dépendances : la cible est posée par un gestionnaire
  // d'événement, jamais par un rendu, et il n'existe donc aucune valeur à
  // surveiller. L'effet se contente de sortir immédiatement quand rien n'attend.
  //
  // ATTENTION : ce report ne vaut que pour les gestes qui MODIFIENT le brouillon,
  // seuls à provoquer le rendu qui déclenchera l'effet. Viser un point qui existe
  // déjà, sans rien changer, n'appelle jamais l'effet : c'est `focusItem` qu'il
  // faut alors employer, sous peine de voir la frappe suivante partir dans le
  // champ resté sous le clavier.
  useEffect(() => {
    const target = focusNext.current;
    if (!target) return;
    focusNext.current = null;
    focusItem(target);
  });

  function patchTheme(index: number, patch: Partial<DraftTheme>) {
    setThemes((prev) =>
      prev.map((theme, i) => (i === index ? { ...theme, ...patch } : theme)),
    );
  }

  function patchItem(themeIndex: number, itemIndex: number, patch: Partial<DraftItem>) {
    setThemes((prev) =>
      prev.map((theme, i) =>
        i === themeIndex
          ? {
              ...theme,
              items: theme.items.map((item, j) =>
                j === itemIndex ? { ...item, ...patch } : item,
              ),
            }
          : theme,
      ),
    );
  }

  /** Insère un point vide à la position donnée et lui donne le clavier. */
  function insertItem(themeIndex: number, at: number) {
    setThemes((prev) =>
      prev.map((theme, i) =>
        i === themeIndex
          ? {
              ...theme,
              items: [
                ...theme.items.slice(0, at),
                // Un point naît en INFORMATION, comme à la lecture d'un Markdown
                // non qualifié : le classer en action demande un geste, ce qui
                // évite d'engager quelqu'un par inadvertance.
                { kind: "info" as const, text: "" },
                ...theme.items.slice(at),
              ],
            }
          : theme,
      ),
    );
    focusNext.current = `${themeIndex}-${at}`;
  }

  function removeItem(themeIndex: number, itemIndex: number, keepFocus = false) {
    setThemes((prev) =>
      prev.map((theme, i) =>
        i === themeIndex
          ? { ...theme, items: theme.items.filter((_, j) => j !== itemIndex) }
          : theme,
      ),
    );
    if (keepFocus && itemIndex > 0) focusNext.current = `${themeIndex}-${itemIndex - 1}`;
  }

  function moveItem(themeIndex: number, itemIndex: number, direction: -1 | 1) {
    const target = itemIndex + direction;
    const theme = themes[themeIndex];
    if (!theme || target < 0 || target >= theme.items.length) return;
    patchTheme(themeIndex, { items: move(theme.items, itemIndex, direction) });
    focusNext.current = `${themeIndex}-${target}`;
  }

  function onItemKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    themeIndex: number,
    itemIndex: number,
  ) {
    // Entrée ouvre le point SUIVANT ; Maj+Entrée reste dans le point courant.
    // C'est la convention des listes partout ailleurs, et le geste qu'on répète
    // le plus en réunion.
    if (event.key === "Enter" && !event.shiftKey && !event.altKey) {
      event.preventDefault();
      insertItem(themeIndex, itemIndex + 1);
      return;
    }
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      moveItem(themeIndex, itemIndex, event.key === "ArrowUp" ? -1 : 1);
      return;
    }
    // Refermer un point resté vide, sans quitter le clavier. Un point qui porte
    // du texte n'est jamais supprimé de cette façon : il faut le bouton.
    if (
      event.key === "Backspace" &&
      !event.currentTarget.value &&
      itemIndex > 0
    ) {
      event.preventDefault();
      removeItem(themeIndex, itemIndex, true);
    }
  }

  function addTheme() {
    setThemes((prev) => [
      ...prev,
      { title: "", items: [{ kind: "info", text: "" }], notesBefore: "", notesAfter: "" },
    ]);
  }

  async function save() {
    setPending(true);
    const res = await updateWikiPageAction({
      id: pageId,
      title: pageTitle,
      content: markdown,
      parentId,
    });
    setPending(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    toast.success(t.wiki.form.updated);
    onDone();
    router.refresh();
  }

  const ai = aiEnabled ? (
    <BuildFromNotes
      pageId={pageId}
      hasThemes={themes.length > 0}
      disabled={pending}
      onThemes={(proposed) =>
        setThemes(
          proposed.map((theme) => ({
            title: theme.title,
            items: theme.items,
            // Rien à conserver : ces thèmes n'existaient pas.
            notesBefore: "",
            notesAfter: "",
          })),
        )
      }
    />
  ) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium">{t.wiki.meeting.editing}</p>
        {themes.length > 0 && ai}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`meeting-preamble-${pageId}`}>
          {t.wiki.meeting.preambleLabel}
        </Label>
        <AutoTextarea
          id={`meeting-preamble-${pageId}`}
          value={preamble}
          onChange={(event) => setPreamble(event.target.value)}
          placeholder={t.wiki.meeting.preamblePlaceholder}
          disabled={pending}
          className="min-h-16"
        />
      </div>

      {/* L'état vide PORTE SES ACTIONS. Le seul bouton « Ajouter un thème »
          vivait en pied de page, à l'autre bout d'un écran par ailleurs vide :
          le message annonçait qu'il n'y avait rien sans dire par où commencer. */}
      {themes.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed p-8 text-center">
          <p className="text-sm text-muted-foreground">
            {t.wiki.meeting.noThemesYet}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {ai}
            <Button type="button" variant="outline" disabled={pending} onClick={addTheme}>
              <Plus />
              {t.wiki.meeting.addTheme}
            </Button>
          </div>
        </div>
      ) : (
        themes.map((theme, themeIndex) => {
          const letter = themeLetter(themeIndex);
          return (
            <section
              key={themeIndex}
              className="@container space-y-2 rounded-lg border p-3"
            >
              <div className="group/row flex flex-wrap items-center gap-2">
                <span className="shrink-0 rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
                  {letter}
                </span>
                {/* L'intitulé « Intitulé du thème A » répétait la pastille posée
                    juste à côté : il ne survit que pour les lecteurs d'écran. */}
                <Input
                  id={`meeting-theme-${pageId}-${themeIndex}`}
                  aria-label={fmt(t.wiki.meeting.themeTitleLabel, { letter })}
                  value={theme.title}
                  onChange={(event) =>
                    patchTheme(themeIndex, { title: event.target.value })
                  }
                  onKeyDown={(event) => {
                    if (event.key !== "Enter") return;
                    event.preventDefault();
                    // Depuis le titre, Entrée descend dans le thème : vers le
                    // premier point s'il existe - et là rien ne change, donc le
                    // clavier se déplace tout de suite - sinon vers celui qu'on
                    // crée, dont il faut attendre la naissance.
                    if (theme.items.length === 0) insertItem(themeIndex, 0);
                    else focusItem(`${themeIndex}-0`);
                  }}
                  placeholder={t.wiki.meeting.themeTitlePlaceholder}
                  disabled={pending}
                  maxLength={120}
                  className="h-8 min-w-40 flex-1 font-medium"
                />
                <Badge variant="secondary" className="shrink-0 font-normal">
                  {fmt(t.wiki.meeting.itemsCount, { count: theme.items.length })}
                </Badge>
                <span className={REVEAL}>
                  <IconButton
                    label={fmt(t.wiki.meeting.moveThemeUp, { letter })}
                    disabled={pending || themeIndex === 0}
                    onClick={() => setThemes((prev) => move(prev, themeIndex, -1))}
                  >
                    <ArrowUp />
                  </IconButton>
                  <IconButton
                    label={fmt(t.wiki.meeting.moveThemeDown, { letter })}
                    disabled={pending || themeIndex === themes.length - 1}
                    onClick={() => setThemes((prev) => move(prev, themeIndex, 1))}
                  >
                    <ArrowDown />
                  </IconButton>
                  <IconButton
                    label={fmt(t.wiki.meeting.removeTheme, { letter })}
                    destructive
                    disabled={pending}
                    onClick={() =>
                      setThemes((prev) => prev.filter((_, i) => i !== themeIndex))
                    }
                  >
                    <Trash2 />
                  </IconButton>
                </span>
              </div>

              <div className="space-y-1">
                {theme.items.map((item, itemIndex) => {
                  const ref = formatItemRef(letter, itemIndex + 1);
                  const action = item.kind === "action";
                  return (
                    // ORDRE VISUEL RENVERSÉ SUR PETIT ÉCRAN. À 390 pixels, la
                    // référence et la pastille ne laissaient au texte que 172
                    // pixels, où la moindre phrase tenait sur quatre lignes.
                    // Le texte passe donc en dessous, sur toute la largeur, et
                    // la ligne du haut ne porte plus que ses repères et ses
                    // commandes. Ce n'est qu'une affaire d'`order` : l'ordre du
                    // document, lui, ne bouge pas, et le clavier suit toujours
                    // référence, nature, texte.
                    <div
                      key={itemIndex}
                      className="group/row flex flex-wrap items-center gap-2 @xl:items-start"
                    >
                      <span className="order-1 w-12 shrink-0 font-mono text-xs text-muted-foreground @xl:pt-2">
                        {ref}
                      </span>
                      {/* Pastille cliquable, et non bouton : deux valeurs
                          seulement, un clic pour passer de l'une à l'autre, et
                          l'apparence exacte de ce que la lecture affichera. */}
                      <button
                        type="button"
                        disabled={pending}
                        title={fmt(t.wiki.meeting.kindToggle, { ref })}
                        aria-label={fmt(t.wiki.meeting.kindToggle, { ref })}
                        aria-pressed={action}
                        onClick={() =>
                          patchItem(themeIndex, itemIndex, {
                            kind: action ? "info" : "action",
                          })
                        }
                        className={cn(
                          "order-2 inline-flex h-6 w-24 shrink-0 items-center justify-center rounded-md border border-transparent px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 @xl:mt-1.5",
                          action
                            ? "bg-primary text-primary-foreground hover:bg-primary/90"
                            : "bg-secondary text-secondary-foreground hover:bg-secondary/80",
                        )}
                      >
                        {action
                          ? t.wiki.meeting.kindAction
                          : t.wiki.meeting.kindInfo}
                      </button>
                      <AutoTextarea
                        data-meeting-item={`${pageId}-${themeIndex}-${itemIndex}`}
                        value={item.text}
                        onChange={(event) =>
                          patchItem(themeIndex, itemIndex, {
                            text: event.target.value,
                          })
                        }
                        onKeyDown={(event) =>
                          onItemKeyDown(event, themeIndex, itemIndex)
                        }
                        placeholder={t.wiki.meeting.itemPlaceholder}
                        disabled={pending}
                        aria-label={fmt(t.wiki.meeting.itemAria, { ref })}
                        className="order-4 w-full @xl:order-3 @xl:w-auto @xl:min-w-40 @xl:flex-1"
                      />
                      <span className={cn(REVEAL, "order-3 ml-auto @xl:order-4 @xl:ml-0 @xl:pt-1")}>
                        <IconButton
                          label={fmt(t.wiki.meeting.moveItemUp, { ref })}
                          disabled={pending || itemIndex === 0}
                          onClick={() => moveItem(themeIndex, itemIndex, -1)}
                        >
                          <ArrowUp />
                        </IconButton>
                        <IconButton
                          label={fmt(t.wiki.meeting.moveItemDown, { ref })}
                          disabled={pending || itemIndex === theme.items.length - 1}
                          onClick={() => moveItem(themeIndex, itemIndex, 1)}
                        >
                          <ArrowDown />
                        </IconButton>
                        <IconButton
                          label={fmt(t.wiki.meeting.removeItem, { ref })}
                          destructive
                          disabled={pending}
                          onClick={() => removeItem(themeIndex, itemIndex)}
                        >
                          <X />
                        </IconButton>
                      </span>
                    </div>
                  );
                })}

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="ml-12 text-muted-foreground"
                  disabled={pending}
                  onClick={() => insertItem(themeIndex, theme.items.length)}
                >
                  <Plus />
                  {t.wiki.meeting.addItem}
                </Button>
              </div>

              {(theme.notesBefore.trim() || theme.notesAfter.trim()) && (
                <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
                  {t.wiki.meeting.notesKept}
                </p>
              )}
            </section>
          );
        })
      )}

      {themes.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={addTheme}>
            <Plus />
            {t.wiki.meeting.addTheme}
          </Button>
          {/* Rappel masqué sur petit écran : personne ne cherche un raccourci
              clavier sur un téléphone, et deux lignes de gris y coûtent cher. */}
          <p className="hidden text-xs text-muted-foreground sm:block">
            {t.wiki.meeting.keyboardHint}
          </p>
        </div>
      )}

      {/* Barre COLLANTE : sur un compte rendu un peu fourni, « Enregistrer »
          se trouvait à quinze cents pixels du haut, hors de toute fenêtre. On
          corrigeait un point du thème A et il fallait dérouler la page entière
          pour valider. Les compteurs y siègent aussi - le nombre d'actions est
          la raison d'être du document, il ne devait pas rester invisible tant
          qu'on écrit. */}
      <div className="sticky bottom-0 z-10 flex flex-wrap items-center justify-between gap-2 border-t bg-background py-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="font-normal">
            {fmt(t.wiki.meeting.itemsCount, { count: itemCount })}
          </Badge>
          {actionCount > 0 && (
            <Badge className="font-normal">
              {actionCount}{" "}
              {actionCount > 1
                ? t.wiki.meeting.actionOther
                : t.wiki.meeting.actionOne}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CancelButton dirty={dirty} disabled={pending} onConfirm={onDone} />
          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Annuler ne demande confirmation QUE si quelque chose a été écrit. Confirmer un
 * abandon qui n'abandonne rien apprend à cliquer « oui » sans lire, et la
 * question perd tout pouvoir le jour où elle protège vraiment un travail.
 */
function CancelButton({
  dirty,
  disabled,
  onConfirm,
}: {
  dirty: boolean;
  disabled?: boolean;
  onConfirm: () => void;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);

  if (!dirty) {
    return (
      <Button type="button" variant="outline" disabled={disabled} onClick={onConfirm}>
        {t.common.cancel}
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" disabled={disabled}>
          {t.common.cancel}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t.wiki.meeting.discardTitle}</DialogTitle>
          <DialogDescription>{t.wiki.meeting.discardDescription}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              {t.wiki.meeting.discardKeep}
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              setOpen(false);
              onConfirm();
            }}
          >
            {t.wiki.meeting.discardConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Construction du compte rendu à partir de NOTES BRUTES, quand l'IA est
 * configurée. Le modèle rend une structure - thèmes, points, nature - que
 * l'éditeur remplit ; il n'écrit pas de Markdown, la mise en forme reste celle
 * du module `meeting-minutes`.
 *
 * Rien n'est enregistré : les thèmes proposés sont un brouillon que l'on relit,
 * corrige et valide. Annuler l'éditeur les efface sans laisser de trace - ce qui
 * autorise à remplacer sans confirmation, en le disant.
 */
function BuildFromNotes({
  pageId,
  hasThemes,
  disabled,
  onThemes,
}: {
  pageId: string;
  hasThemes: boolean;
  disabled?: boolean;
  onThemes: (themes: Array<{ title: string; items: DraftItem[] }>) => void;
}) {
  const t = useDict();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [running, setRunning] = useState(false);

  async function analyse() {
    setRunning(true);
    const res = await generateMeetingFromTextAction({ pageId, text: notes });
    setRunning(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    const themes = res.data?.themes ?? [];
    onThemes(themes);
    toast.success(fmt(t.wiki.meeting.aiDone, { count: themes.length }));
    setOpen(false);
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !running && setOpen(next)}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled}>
          <Sparkles />
          {t.wiki.meeting.aiBuild}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t.wiki.meeting.aiTitle}</DialogTitle>
          <DialogDescription>{t.wiki.meeting.aiDescription}</DialogDescription>
        </DialogHeader>
        <Textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder={t.wiki.meeting.aiPlaceholder}
          rows={12}
          maxLength={20000}
          disabled={running}
          className="resize-y"
          autoFocus
        />
        {hasThemes && (
          <p className="rounded-md border border-dashed p-2 text-xs text-muted-foreground">
            {t.wiki.meeting.aiReplace}
          </p>
        )}
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" disabled={running}>
              {t.common.cancel}
            </Button>
          </DialogClose>
          <Button
            type="button"
            disabled={running || !notes.trim()}
            onClick={() => void analyse()}
          >
            {running && <Loader2 className="animate-spin" />}
            {t.wiki.meeting.aiSubmit}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Bouton d'action compact : l'intitulé accessible n'est jamais visuel. */
function IconButton({
  label,
  children,
  onClick,
  disabled,
  destructive = false,
}: {
  label: string;
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        "size-7 shrink-0 text-muted-foreground [&_svg]:size-3.5",
        destructive && "hover:text-destructive",
      )}
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

/**
 * Bascule entre la LECTURE (rendue côté serveur, avec ses liens de tickets et son
 * récapitulatif) et l'ÉDITION. Le rendu de lecture arrive en `children` : c'est
 * ce qui permet de garder un composant serveur riche derrière une bascule
 * client, sans dupliquer l'affichage.
 */
export function MeetingSection({
  pageId,
  pageTitle,
  parentId,
  content,
  canEdit,
  aiEnabled,
  children,
}: {
  pageId: string;
  pageTitle: string;
  parentId: string | null;
  content: string;
  canEdit: boolean;
  aiEnabled?: boolean;
  children: ReactNode;
}) {
  const t = useDict();
  const [editing, setEditing] = useState(false);

  if (!canEdit) return <>{children}</>;

  if (editing) {
    return (
      <MeetingEditor
        pageId={pageId}
        pageTitle={pageTitle}
        parentId={parentId}
        content={content}
        aiEnabled={aiEnabled}
        onDone={() => setEditing(false)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setEditing(true)}
        >
          <Pencil />
          {t.wiki.meeting.editItems}
        </Button>
      </div>
      {children}
    </div>
  );
}
