"use client";

import type { ClipboardEvent } from "react";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  REPORT_SECTIONS,
  isRequiredSection,
  type ReportBody,
  type ReportSection,
} from "@/lib/ticket-template";
import { useDict } from "@/i18n/provider";

/**
 * Saisie des rubriques d'un RAPPORT (Observation / Attendu / Contexte /
 * Alignement aux spécifications), pour les types de tickets qui l'imposent.
 *
 * Composant volontairement PASSIF : il n'enregistre rien, ne valide rien et ne
 * connaît ni le ticket ni la langue de stockage. Il expose un `ReportBody` et
 * laisse ses deux appelants - le dialogue de création et l'éditeur de
 * description - décider quand sérialiser et vers quel Markdown. C'est ce qui
 * permet aux deux surfaces d'être rigoureusement identiques à la saisie.
 *
 * Le découpage en champs distincts est le cœur de la fonctionnalité : demander
 * « une description » produit « ça marche pas » ; demander ce qu'on a vu, puis
 * ce qu'on attendait, puis dans quelles conditions, produit un rapport
 * exploitable. Les textes d'aide portent donc autant que les intitulés.
 */
export function ReportFields({
  idPrefix,
  value,
  onChange,
  disabled = false,
  rows = 3,
  onPaste,
}: {
  /** Préfixe des `id` : deux formulaires peuvent coexister sur une même page. */
  idPrefix: string;
  value: ReportBody;
  onChange: (next: ReportBody) => void;
  disabled?: boolean;
  rows?: number;
  /** Collage d'image : le dialogue de création en fait une pièce jointe. */
  onPaste?: (event: ClipboardEvent<HTMLTextAreaElement>) => void;
}) {
  const t = useDict();

  // Table explicite plutôt qu'un accès par clef calculée : ajouter une rubrique
  // au modèle casse ici, à la compilation, au lieu de rendre « undefined ».
  const meta: Record<ReportSection, { label: string; placeholder: string }> = {
    observation: {
      label: t.ticketTemplate.observation,
      placeholder: t.ticketTemplate.observationPlaceholder,
    },
    expected: {
      label: t.ticketTemplate.expected,
      placeholder: t.ticketTemplate.expectedPlaceholder,
    },
    context: {
      label: t.ticketTemplate.context,
      placeholder: t.ticketTemplate.contextPlaceholder,
    },
    specs: {
      label: t.ticketTemplate.specs,
      placeholder: t.ticketTemplate.specsPlaceholder,
    },
  };

  return (
    <div className="space-y-3">
      {REPORT_SECTIONS.map((section) => {
        const required = isRequiredSection(section);
        const id = `${idPrefix}-${section}`;
        return (
          <div key={section} className="space-y-1.5">
            <Label htmlFor={id}>
              {meta[section].label}{" "}
              {required ? (
                <span className="text-destructive">*</span>
              ) : (
                <span className="text-xs font-normal text-muted-foreground">
                  ({t.ticketTemplate.optional})
                </span>
              )}
            </Label>
            <Textarea
              id={id}
              value={value[section]}
              onChange={(event) =>
                onChange({ ...value, [section]: event.target.value })
              }
              onPaste={onPaste}
              placeholder={meta[section].placeholder}
              rows={rows}
              disabled={disabled}
              // Chaque rubrique reste étirable : un contexte tient en une ligne,
              // une observation peut contenir une trace d'exécution entière.
              className="resize-y"
            />
          </div>
        );
      })}
      <p className="text-xs text-muted-foreground">
        {t.ticketTemplate.requiredHint}
      </p>
    </div>
  );
}
