"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  COMPONENT_KIND_ICONS,
  type ComponentOption,
} from "@/components/ticket/ticket-fields";
import { useDict } from "@/i18n/provider";

/**
 * Sélecteur de COMPOSANT réutilisable - la brique d'interface partagée par
 * toutes les surfaces qui contextualisent une demande : création de ticket,
 * édition, revue des brouillons générés par l'IA et barre de filtres.
 *
 * Générique par construction : tous les textes (libellé, option « aucun »,
 * `aria-label`) arrivent en props, si bien qu'il fonctionne aussi bien dans les
 * écrans traduits (`useDict()`) que dans le dialogue de génération. Le composant
 * est CONTRÔLÉ ; la valeur « aucun composant » est portée par une sentinelle
 * (Radix interdit la chaîne vide comme valeur d'option).
 */

export interface ComponentSelectProps {
  /** Id du champ : relie le `<Label>` au déclencheur du `<Select>`. */
  id: string;
  /** Catalogue du projet, déjà ordonné. Vide = le composant ne rend rien. */
  components: ComponentOption[];
  /** Valeur courante : un id de composant, ou `emptyValue`. */
  value: string;
  onChange: (value: string) => void;
  /** Libellé affiché au-dessus du champ. Omis = pas de `<Label>` rendu. */
  label?: string;
  /** Valeur sentinelle représentant « aucun composant » / « tous ». */
  emptyValue: string;
  /** Texte de l'option sentinelle (ex. « Aucun composant », « Tous les composants »). */
  emptyLabel: string;
  /** `aria-label` du déclencheur (par défaut : `label`). */
  ariaLabel?: string;
  /** Classe appliquée au déclencheur (largeur dans une barre de filtres, etc.). */
  triggerClassName?: string;
  disabled?: boolean;
}

export function ComponentSelect({
  id,
  components,
  value,
  onChange,
  label,
  emptyValue,
  emptyLabel,
  ariaLabel,
  triggerClassName,
  disabled,
}: ComponentSelectProps) {
  // Dégradation en douceur : tant que le projet n'a déclaré aucun composant, le
  // champ n'a rien à proposer - on ne l'affiche pas plutôt que d'exposer un
  // sélecteur vide. Le catalogue se remplit dans les paramètres du projet.
  if (components.length === 0) return null;

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
          {components.map((component) => (
            <SelectItem key={component.id} value={component.id}>
              <ComponentOptionLabel component={component} />
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

/**
 * Contenu d'une option : icône de nature teintée + nom du composant.
 *
 * L'icône est lue directement dans la table (avec repli sur `PAGE`) plutôt que
 * via un appel de fonction, pour rester une référence de composant stable au
 * rendu. Elle est décorative : la nature est donc AUSSI énoncée en texte réservé
 * aux lecteurs d'écran, sans quoi elle ne serait portée que par une icône
 * masquée et une couleur - invisible pour qui n'y a pas accès.
 *
 * Le libellé de nature vient ici du dictionnaire (et non d'une prop, comme dans
 * `ComponentBadge`) : ce module est un composant client, il peut donc lire le
 * contexte i18n, quand `ComponentBadge` doit rester utilisable côté serveur.
 */
function ComponentOptionLabel({ component }: { component: ComponentOption }) {
  const t = useDict();
  const Icon = COMPONENT_KIND_ICONS[component.kind] ?? COMPONENT_KIND_ICONS.PAGE;
  return (
    <span className="flex items-center gap-2">
      <Icon
        className="size-3.5 shrink-0"
        style={{ color: component.color }}
        aria-hidden
      />
      <span className="sr-only">{t.taxonomy.componentKinds[component.kind]}</span>{" "}
      {component.name}
    </span>
  );
}
