"use client";

import { useState, type ReactNode } from "react";
import { Loader2, Pencil } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDict } from "@/i18n/provider";
import { fmt } from "@/i18n";

/**
 * ÉDITION EN PLACE d'un champ à CHOIX UNIQUE - pendant de `InlineEdit` pour les
 * relations (assigné, sprint, module, composant, type, priorité, statut).
 *
 * Différences assumées avec la saisie de texte :
 *  - il n'y a rien à « valider » : choisir une option enregistre aussitôt, il
 *    n'existe pas d'état intermédiaire à confirmer ;
 *  - le rendu en lecture est libre (`children`), pour conserver les badges
 *    colorés existants plutôt que de tout réduire à du texte brut.
 *
 * Comme `InlineEdit`, la lecture est un vrai `<button>` : accessible au clavier,
 * et l'affordance n'apparaît qu'au survol pour ne pas alourdir le panneau.
 */

export interface InlineSelectOption {
  value: string;
  label: string;
  /** Pastille de couleur facultative (type, priorité, module…). */
  color?: string;
}

export interface InlineSelectProps {
  /** Valeur courante ; `emptyValue` quand le champ n'est pas renseigné. */
  value: string;
  options: InlineSelectOption[];
  /** Enregistre. Renvoyer `false` laisse la valeur affichée inchangée. */
  onSave: (value: string) => Promise<boolean>;
  /** Nom du champ, pour l'intitulé accessible (« Modifier {field} »). */
  field: string;
  /**
   * Sentinelle « aucun » (Radix interdit la chaîne vide) et son libellé.
   *
   * ABSENTES pour un champ OBLIGATOIRE - type, priorité, statut : il n'y a rien
   * à retirer, et la proposition était non seulement inutile mais piégeuse, la
   * choisir envoyant au serveur une valeur qu'il refuse.
   */
  emptyValue?: string;
  emptyLabel?: string;
  /** Rendu en lecture (badge, nom…). À défaut : le libellé de l'option courante. */
  children?: ReactNode;
  /** Sans droit d'édition : rendu figé, sans affordance. */
  disabled?: boolean;
  /**
   * Rendu DENSE, sans crayon : le survol et le curseur suffisent à dire que la
   * cellule s'ouvre. Mesuré dans la liste des tickets : l'icône, même invisible
   * au repos, réservait sa place dans chacune des sept colonnes modifiables et
   * élargissait le tableau de 109 pixels - au point de repousser hors de vue la
   * colonne de droite.
   */
  compact?: boolean;
}

export function InlineSelect({
  value,
  options,
  onSave,
  field,
  emptyValue,
  emptyLabel,
  children,
  disabled = false,
  compact = false,
}: InlineSelectProps) {
  const t = useDict();
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);

  const display =
    children ?? (
      <span className={value === emptyValue ? "text-muted-foreground" : undefined}>
        {options.find((o) => o.value === value)?.label ?? emptyLabel}
      </span>
    );
  const clearable = emptyValue !== undefined;

  if (disabled) return <span className="mt-0.5 block">{display}</span>;

  if (editing) {
    return (
      <Select
        open
        value={value}
        disabled={pending}
        onOpenChange={(open) => {
          // Refermer sans choisir (Échap, clic à côté) revient à annuler.
          if (!open) setEditing(false);
        }}
        onValueChange={async (next) => {
          if (next === value) {
            setEditing(false);
            return;
          }
          setPending(true);
          const ok = await onSave(next);
          setPending(false);
          setEditing(false);
          void ok;
        }}
      >
        <SelectTrigger
          className="mt-0.5 h-8 w-full"
          aria-label={fmt(t.common.inline.editAria, { field })}
        >
          {pending ? <Loader2 className="animate-spin" /> : <SelectValue />}
        </SelectTrigger>
        <SelectContent>
          {clearable && <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <span className="flex items-center gap-2">
                {option.color && (
                  <span
                    className="size-2 shrink-0 rounded-full"
                    style={{ backgroundColor: option.color }}
                    aria-hidden
                  />
                )}
                {option.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={fmt(t.common.inline.editAria, { field })}
      aria-label={fmt(t.common.inline.editAria, { field })}
      className={cn(
        "group/inline -mx-2 mt-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-0.5 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span className="min-w-0 flex-1">{display}</span>
      {!compact && (
        <Pencil
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
