"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * ÉDITION EN PLACE - primitive réutilisable. Le texte affiché devient saisissable
 * d'un clic (ou au clavier), sans passer par un dialogue.
 *
 * Points de conception :
 *  - ACCESSIBILITÉ. En lecture, le texte est rendu dans un vrai `<button>` : il
 *    entre donc dans l'ordre de tabulation et s'active à Entrée comme à Espace.
 *    Un `<div onClick>` aurait la même apparence mais serait inatteignable au
 *    clavier - une régression pour qui n'utilise pas la souris.
 *  - RACCOURCIS. Échap annule et restaure la valeur d'origine ; Entrée valide
 *    (⌘/Ctrl + Entrée en multiligne, où Entrée insère un retour à la ligne) ;
 *    perdre le focus valide aussi, comme dans la plupart des éditeurs en place.
 *    Échap doit donc neutraliser la sauvegarde au blur qui suit immédiatement,
 *    d'où le drapeau `cancelledRef`.
 *  - PAS D'ÉCRITURE INUTILE. Une valeur inchangée referme le champ sans appeler
 *    le serveur.
 *  - COHÉRENCE APRÈS ENREGISTREMENT. Le parent rafraîchit ses données ; on
 *    réaligne le brouillon sur la valeur canonique dès qu'elle arrive, mais
 *    jamais pendant une édition en cours (on écraserait la saisie).
 */

export interface InlineEditProps {
  /** Valeur canonique venant du serveur. */
  value: string;
  /**
   * Enregistre la nouvelle valeur. Renvoyer `false` signale un échec : le champ
   * reste ouvert pour que la saisie ne soit pas perdue.
   */
  onSave: (value: string) => Promise<boolean>;
  /** Nom du champ, pour l'intitulé accessible (« Modifier {field} »). */
  field: string;
  /** Saisie multiligne (description) plutôt qu'une ligne unique (titre, nom). */
  multiline?: boolean;
  /** Refuse une valeur vide (titre de ticket, nom de composant…). */
  required?: boolean;
  maxLength?: number;
  rows?: number;
  /** Classe appliquée au texte affiché ET à la saisie, pour une bascule sans saut. */
  className?: string;
  /** Texte affiché quand la valeur est vide (invite à cliquer). */
  emptyLabel?: string;
  /** Sans droit d'édition : rendu en texte simple, sans aucune affordance. */
  disabled?: boolean;
}

export function InlineEdit({
  value,
  onSave,
  field,
  multiline = false,
  required = false,
  maxLength,
  rows = 4,
  className,
  emptyLabel,
  disabled = false,
}: InlineEditProps) {
  const t = useDict();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [pending, setPending] = useState(false);
  const [syncedValue, setSyncedValue] = useState(value);
  const cancelledRef = useRef(false);

  // Ajustement d'état pendant le rendu (plutôt qu'un effet) : la valeur serveur
  // a changé, on s'y réaligne - sauf si l'utilisateur est en train de saisir.
  if (value !== syncedValue && !editing && !pending) {
    setSyncedValue(value);
    setDraft(value);
  }

  const placeholder = emptyLabel ?? t.common.inline.empty;

  if (disabled) {
    // Sans droit d'édition, on retombe sur le MÊME libellé d'absence que le mode
    // éditable (« Aucune description. » plutôt qu'un tiret) : le texte lu ne doit
    // pas dépendre des droits de l'utilisateur.
    return draft ? (
      <span className={className}>{draft}</span>
    ) : (
      <span className={cn(className, "text-muted-foreground")}>{placeholder}</span>
    );
  }

  async function commit() {
    const next = draft.trim();
    if (required && !next) {
      toast.error(t.common.inline.required);
      return;
    }
    if (next === value.trim()) {
      setDraft(value);
      setEditing(false);
      return;
    }

    setPending(true);
    const ok = await onSave(next);
    setPending(false);
    if (!ok) return; // on garde le champ ouvert : la saisie n'est pas perdue
    setDraft(next);
    setSyncedValue(next);
    setEditing(false);
  }

  function cancel() {
    cancelledRef.current = true;
    setDraft(value);
    setEditing(false);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      cancel();
      return;
    }
    if (event.key === "Enter") {
      // En multiligne, Entrée écrit une nouvelle ligne : seul ⌘/Ctrl valide.
      if (multiline && !(event.metaKey || event.ctrlKey)) return;
      event.preventDefault();
      void commit();
    }
  }

  function handleBlur() {
    // Échap vient de fermer le champ : ne pas enregistrer dans la foulée.
    if (cancelledRef.current) {
      cancelledRef.current = false;
      return;
    }
    void commit();
  }

  if (editing) {
    const shared = {
      value: draft,
      autoFocus: true,
      disabled: pending,
      maxLength,
      onKeyDown: handleKeyDown,
      onBlur: handleBlur,
      "aria-label": fmt(t.common.inline.editAria, { field }),
      onChange: (e: { target: { value: string } }) => setDraft(e.target.value),
      // Curseur en fin de texte à l'ouverture, plutôt qu'une sélection totale :
      // on vient le plus souvent compléter, pas tout réécrire.
      onFocus: (e: {
        target: { value: string; setSelectionRange?: (a: number, b: number) => void };
      }) => e.target.setSelectionRange?.(e.target.value.length, e.target.value.length),
    };

    return (
      <span className="block">
        {multiline ? (
          <textarea
            {...shared}
            rows={rows}
            className={cn(
              "w-full resize-y rounded-md border border-input bg-transparent px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              className,
            )}
          />
        ) : (
          <input
            {...shared}
            type="text"
            className={cn(
              "w-full rounded-md border border-input bg-transparent px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60",
              className,
            )}
          />
        )}
        <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
          {pending && <Loader2 className="size-3 animate-spin" />}
          {multiline ? t.common.inline.hintMultiline : t.common.inline.hint}
        </span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={fmt(t.common.inline.editAria, { field })}
      aria-label={fmt(t.common.inline.editAria, { field })}
      className={cn(
        // `cursor-text` plutot que le `cursor-pointer` par defaut d'un bouton :
        // ce qui va se passer au clic, c'est une saisie de texte, pas une navigation.
        "group/inline -mx-2 flex w-full cursor-text items-start gap-1.5 rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className,
      )}
    >
      <span className={cn("min-w-0 flex-1", !draft && "text-muted-foreground")}>
        {draft || placeholder}
      </span>
      {/* Crayon révélé au survol / focus : signale l'affordance sans alourdir
          la lecture. `aria-hidden` car l'intitulé du bouton la porte déjà. */}
      <Pencil
        className="mt-0.5 size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
        aria-hidden
      />
    </button>
  );
}
