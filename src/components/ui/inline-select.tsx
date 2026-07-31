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
          /**
           * MÊME ENCOMBREMENT QU'EN LECTURE, sinon la ligne - et donc tout le
           * tableau - se déplace au moment où l'on ouvre le champ.
           *
           * Deux causes, chacune corrigée ici : la hauteur du déclencheur, plus
           * grande que celle du badge qu'il remplace ; et son contenu, qui
           * passait à la ligne (« Tableau / Kanban »), le pli du sélecteur ne
           * s'appliquant qu'à son enfant DIRECT - or Radix y recopie l'élément
           * choisi, lequel a sa propre mise en page.
           */
          className={cn(
            "w-full min-w-0 whitespace-nowrap [&_*]:whitespace-nowrap [&>span]:min-w-0 [&>span]:truncate",
            /* Marges, écart et chevron ramenés au gabarit de la lecture : ce
               sont eux qui réclamaient une trentaine de pixels de plus, pris à
               la colonne du titre - qui passait alors sur une ligne de plus, et
               toute la ligne grandissait. */
            /* Le CHEVRON est masqué en mode dense : la liste est déjà ouverte
               sous le champ, il n'annonce donc rien - et ses seize pixels, plus
               l'écart et les marges, suffisaient à élargir la colonne aux dépens
               du titre, qui passait sur une ligne de plus. */
            /* Ni bordure ni ombre non plus : le champ ouvert occupe alors
               EXACTEMENT la place qu'occupait sa lecture. Le fond suffit à dire
               qu'il est actif, et la liste déployée juste dessous le confirme. */
            compact
              /* Le même dépassement latéral qu'en lecture (`-mx-1 px-1`) : sans
                 lui, les huit pixels de marge s'ajoutaient à la largeur demandée
                 par la colonne, quand ceux de la lecture sont repris par la
                 marge négative. */
              ? "-mx-1 h-6 gap-0 border-0 bg-muted px-1 shadow-none [&>svg]:hidden"
              : "mt-0.5 h-8",
          )}
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
        "group/inline flex items-center gap-1.5 rounded-md text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        /* La lecture réserve la hauteur du déclencheur : passer de l'une à
           l'autre ne bouge alors plus rien. */
        compact && "h-6",
        /* `w-full` occupe la ligne, ce qu'il faut dans un panneau en colonne -
           et ce qui, dans une rangée de badges qui s'enroule, rejetait tous les
           suivants à la ligne d'après. Le dépassement latéral, lui, donne de
           l'air au panneau mais coûtait douze pixels par badge sur une carte. */
        compact ? "-mx-1 px-1" : "w-full -mx-2 mt-0.5 px-2 py-0.5",
      )}
    >
      {/* Conteneur FLEX en mode dense : un cartouche est un élément en ligne,
          et posé sur une ligne de base de texte il traîne derrière lui la place
          des jambages - trois pixels de plus que sa propre hauteur, et une
          rangée qui ne s'aligne plus. */}
      <span className={cn("min-w-0 flex-1", compact && "flex items-center")}>
        {display}
      </span>
      {!compact && (
        <Pencil
          className="size-3.5 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/inline:opacity-100 group-focus-visible/inline:opacity-100"
          aria-hidden
        />
      )}
    </button>
  );
}
