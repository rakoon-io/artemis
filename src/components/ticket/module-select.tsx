"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModuleOption } from "@/components/ticket/ticket-fields";

/**
 * Sélecteur de MODULE réutilisable - pendant de `ComponentSelect`, un cran plus
 * haut dans la structure produit. Partagé par les formulaires de ticket, la
 * barre de filtres et le gestionnaire de composants (choix du rattachement).
 *
 * Générique par construction : tous les textes arrivent en props. Contrôlé, avec
 * une sentinelle pour « aucun module » / « tous les modules » (Radix interdit la
 * chaîne vide comme valeur d'option).
 */

export interface ModuleSelectProps {
  /** Id du champ : relie le `<Label>` au déclencheur du `<Select>`. */
  id: string;
  /** Modules du projet, déjà ordonnés. Vide = le composant ne rend rien. */
  modules: ModuleOption[];
  /** Valeur courante : un id de module, ou `emptyValue`. */
  value: string;
  onChange: (value: string) => void;
  /** Libellé affiché au-dessus du champ. Omis = pas de `<Label>` rendu. */
  label?: string;
  /** Valeur sentinelle représentant « aucun module » / « tous ». */
  emptyValue: string;
  emptyLabel: string;
  /** `aria-label` du déclencheur (par défaut : `label`). */
  ariaLabel?: string;
  /** Aide affichée sous le champ (ex. « déterminé par le composant choisi »). */
  description?: string;
  triggerClassName?: string;
  disabled?: boolean;
}

export function ModuleSelect({
  id,
  modules,
  value,
  onChange,
  label,
  emptyValue,
  emptyLabel,
  ariaLabel,
  description,
  triggerClassName,
  disabled,
}: ModuleSelectProps) {
  // Dégradation en douceur : tant que le projet ne déclare aucun module, la
  // notion n'existe pas pour l'utilisateur - on n'affiche pas un champ vide.
  if (modules.length === 0) return null;

  return (
    <div className="space-y-1.5">
      {label && <Label htmlFor={id}>{label}</Label>}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          id={id}
          className={triggerClassName}
          aria-label={ariaLabel ?? label}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={emptyValue}>{emptyLabel}</SelectItem>
          {modules.map((module) => (
            <SelectItem key={module.id} value={module.id}>
              <span className="flex items-center gap-2">
                <span
                  className="size-2 shrink-0 rounded-full"
                  style={{ backgroundColor: module.color }}
                  aria-hidden
                />
                {module.name}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
