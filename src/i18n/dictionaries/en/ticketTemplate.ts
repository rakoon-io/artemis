import type { TicketTemplateDict } from "../fr/ticketTemplate";

/**
 * Modele de ticket : les rubriques imposees a la description d'un ticket dont le
 * type l'exige (cf. src/lib/ticket-template.ts).
 *
 * ATTENTION - ces intitules sont des libelles de FORMULAIRE. Les titres
 * reellement ecrits dans le Markdown sont GELES dans ticket-template.ts et
 * n'ont pas de contrepartie ici : retoucher une traduction ne rend donc illisible
 * aucun ticket deja enregistre. Traduire autrement une rubrique suppose en
 * revanche d'AJOUTER la forme correspondante a la table d'alias de ce module.
 */
export const ticketTemplate: TicketTemplateDict = {
  // Choix du modele (Parametres -> Types de tickets)
  fieldLabel: "Description template",
  fieldAria: "Description template enforced by this type",
  none: "Free-form description",
  noneHint: "No required sections: the description stays entirely free-form.",
  report: "Structured report",
  reportHint:
    "Observed, Expected and Context become mandatory; “Specification alignment” stays optional.",
  badge: "Template enforced",

  // Rubriques (libelles de formulaire)
  observation: "Observed",
  expected: "Expected",
  context: "Context",
  specs: "Specification alignment",
  optional: "optional",

  // Aides de saisie : elles portent la moitie de la valeur du modele, en disant
  // ce que l'on attend dans chaque rubrique plutot que de la nommer seulement.
  observationPlaceholder: "What actually happens…",
  expectedPlaceholder: "What should happen instead…",
  contextPlaceholder: "Screen, browser, account, data set, steps to reproduce…",
  specsPlaceholder:
    "Which rule or specification is involved, and how it is not met…",

  // Validation cote client. Le serveur impose la meme regle et nomme, lui, les
  // rubriques restees vides.
  requiredHint: "Observed, Expected and Context are required.",

  // Renvoi depuis le dialogue d'edition, qui n'a qu'un champ libre
  editInPlace:
    "This type enforces a structured report: edit the description on the ticket itself, in the “Description” card.",

  // Bascule entre le formulaire et le Markdown brut
  structuredTab: "Sections",
  freeformTab: "Markdown",
  freeformNotice:
    "This description does not follow the template: edit it as Markdown, or fill in the sections to bring it back under the template.",
  extraKept: "Content placed after the sections is preserved as-is.",
};
