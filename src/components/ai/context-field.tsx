"use client";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface ContextFieldProps {
  /** Id du champ (lie le `<Label>` au `<Textarea>`). */
  id: string;
  value: string;
  onChange: (value: string) => void;
  /** Libellé affiché (par défaut « Contexte »). Textes en props = réutilisable. */
  label?: string;
  /** Aide facultative sous le champ. */
  description?: string;
  placeholder?: string;
  rows?: number;
  maxLength?: number;
  disabled?: boolean;
}

/**
 * Champ de « contexte » réutilisable : un libellé, une zone de texte et une aide
 * facultative, pour enrichir une demande (ex. consignes envoyées à l'IA). Contrôlé
 * et générique (tous les textes passent par les props), donc réutilisable au-delà
 * de la génération de tickets.
 */
export function ContextField({
  id,
  value,
  onChange,
  label = "Contexte",
  description,
  placeholder,
  rows = 3,
  maxLength = 4000,
  disabled,
}: ContextFieldProps) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        disabled={disabled}
      />
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
