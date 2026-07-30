"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDown,
  ArrowUp,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/** Déplace un élément d'un cran ; renvoie une nouvelle liste. */
function move<T>(list: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function MeetingEditor({
  pageId,
  pageTitle,
  parentId,
  content,
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
  onDone: () => void;
}) {
  const t = useDict();
  const router = useRouter();
  const parsed = parseMeeting(content);

  const [preamble, setPreamble] = useState(parsed?.preamble ?? "");
  const [themes, setThemes] = useState<DraftTheme[]>(
    parsed?.themes.map((theme) => ({
      title: theme.title,
      items: theme.items.map((item) => ({ kind: item.kind, text: item.text })),
      notesBefore: theme.notesBefore,
      notesAfter: theme.notesAfter,
    })) ?? [],
  );
  const [pending, setPending] = useState(false);

  // Une page sans thème s'édite aussi : c'est même le cas où l'éditeur sert le
  // plus, puisqu'il n'y a rien à recopier d'un exemple.
  const headingLevel = parsed?.headingLevel ?? 2;

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

  async function save() {
    setPending(true);
    const markdown = serializeMeeting({
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

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor={`meeting-preamble-${pageId}`}>
          {t.wiki.meeting.preambleLabel}
        </Label>
        <Textarea
          id={`meeting-preamble-${pageId}`}
          value={preamble}
          onChange={(event) => setPreamble(event.target.value)}
          placeholder={t.wiki.meeting.preamblePlaceholder}
          rows={2}
          disabled={pending}
          className="resize-y"
        />
      </div>

      {themes.length === 0 && (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          {t.wiki.meeting.noThemesYet}
        </p>
      )}

      {themes.map((theme, themeIndex) => {
        const letter = themeLetter(themeIndex);
        return (
          <section key={themeIndex} className="space-y-3 rounded-lg border p-3">
            <div className="flex flex-wrap items-end gap-2">
              <span className="mb-1.5 rounded-md border bg-muted px-2 py-0.5 font-mono text-sm">
                {letter}
              </span>
              <div className="min-w-48 flex-1 space-y-1.5">
                <Label htmlFor={`meeting-theme-${pageId}-${themeIndex}`}>
                  {fmt(t.wiki.meeting.themeTitleLabel, { letter })}
                </Label>
                <Input
                  id={`meeting-theme-${pageId}-${themeIndex}`}
                  value={theme.title}
                  onChange={(event) =>
                    patchTheme(themeIndex, { title: event.target.value })
                  }
                  placeholder={t.wiki.meeting.themeTitlePlaceholder}
                  disabled={pending}
                  maxLength={120}
                />
              </div>
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
            </div>

            <div className="space-y-2">
              {theme.items.map((item, itemIndex) => {
                const ref = formatItemRef(letter, itemIndex + 1);
                return (
                  <div key={itemIndex} className="flex flex-wrap items-start gap-2">
                    <span className="mt-2 w-14 shrink-0 font-mono text-xs text-muted-foreground">
                      {ref}
                    </span>
                    <Select
                      value={item.kind}
                      disabled={pending}
                      onValueChange={(value) =>
                        patchItem(themeIndex, itemIndex, {
                          kind: value as MeetingItemKind,
                        })
                      }
                    >
                      <SelectTrigger
                        className="w-40 shrink-0"
                        aria-label={t.wiki.meeting.colKind}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="info">
                          {t.wiki.meeting.kindInfo}
                        </SelectItem>
                        <SelectItem value="action">
                          {t.wiki.meeting.kindAction}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <Textarea
                      value={item.text}
                      onChange={(event) =>
                        patchItem(themeIndex, itemIndex, {
                          text: event.target.value,
                        })
                      }
                      placeholder={t.wiki.meeting.itemPlaceholder}
                      rows={1}
                      disabled={pending}
                      aria-label={fmt(t.wiki.meeting.colItem + " {ref}", { ref })}
                      className="min-w-48 flex-1 resize-y"
                    />
                    <IconButton
                      label={fmt(t.wiki.meeting.moveItemUp, { ref })}
                      disabled={pending || itemIndex === 0}
                      onClick={() =>
                        patchTheme(themeIndex, {
                          items: move(theme.items, itemIndex, -1),
                        })
                      }
                    >
                      <ArrowUp />
                    </IconButton>
                    <IconButton
                      label={fmt(t.wiki.meeting.moveItemDown, { ref })}
                      disabled={pending || itemIndex === theme.items.length - 1}
                      onClick={() =>
                        patchTheme(themeIndex, {
                          items: move(theme.items, itemIndex, 1),
                        })
                      }
                    >
                      <ArrowDown />
                    </IconButton>
                    <IconButton
                      label={fmt(t.wiki.meeting.removeItem, { ref })}
                      destructive
                      disabled={pending}
                      onClick={() =>
                        patchTheme(themeIndex, {
                          items: theme.items.filter((_, j) => j !== itemIndex),
                        })
                      }
                    >
                      <X />
                    </IconButton>
                  </div>
                );
              })}

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  patchTheme(themeIndex, {
                    // Un point naît en INFORMATION, comme à la lecture d'un
                    // Markdown non qualifié : le classer en action demande un
                    // geste, ce qui évite d'engager quelqu'un par inadvertance.
                    items: [...theme.items, { kind: "info", text: "" }],
                  })
                }
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
      })}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          onClick={() =>
            setThemes((prev) => [
              ...prev,
              {
                title: t.wiki.meeting.newThemeTitle,
                items: [],
                notesBefore: "",
                notesAfter: "",
              },
            ])
          }
        >
          <Plus />
          {t.wiki.meeting.addTheme}
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onDone}>
            {t.common.cancel}
          </Button>
          <Button type="button" disabled={pending} onClick={() => void save()}>
            {pending && <Loader2 className="animate-spin" />}
            {t.common.save}
          </Button>
        </div>
      </div>
    </div>
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
      className={
        destructive
          ? "size-8 shrink-0 text-muted-foreground hover:text-destructive"
          : "size-8 shrink-0 text-muted-foreground"
      }
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
  children,
}: {
  pageId: string;
  pageTitle: string;
  parentId: string | null;
  content: string;
  canEdit: boolean;
  children: ReactNode;
}) {
  const t = useDict();
  const [editing, setEditing] = useState(false);

  if (!canEdit) return <>{children}</>;

  if (editing) {
    return (
      <div className="space-y-4">
        <p className="text-sm font-medium">{t.wiki.meeting.editing}</p>
        <MeetingEditor
          pageId={pageId}
          pageTitle={pageTitle}
          parentId={parentId}
          content={content}
          onDone={() => setEditing(false)}
        />
      </div>
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
