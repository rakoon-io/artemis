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
export const ticketTemplate = {
  // Choix du modele (Parametres -> Types de tickets)
  fieldLabel: "Modèle de description",
  fieldAria: "Modèle de description imposé par ce type",
  none: "Description libre",
  noneHint: "Aucune rubrique imposée : la description reste entièrement libre.",
  report: "Rapport structuré",
  reportHint:
    "Observation, Attendu et Contexte deviennent obligatoires ; « Alignement aux spécifications » reste facultatif.",
  badge: "Modèle imposé",

  // Rubriques (libelles de formulaire)
  observation: "Observation",
  expected: "Attendu",
  context: "Contexte",
  specs: "Alignement aux spécifications",
  optional: "facultatif",

  // Aides de saisie : elles portent la moitie de la valeur du modele, en disant
  // ce que l'on attend dans chaque rubrique plutot que de la nommer seulement.
  observationPlaceholder: "Ce qui se produit réellement…",
  expectedPlaceholder: "Ce qui devrait se produire à la place…",
  contextPlaceholder:
    "Écran, navigateur, compte, jeu de données, étapes pour reproduire…",
  specsPlaceholder:
    "Règle ou spécification concernée, et en quoi elle n'est pas respectée…",

  // Validation cote client. Le serveur impose la meme regle et nomme, lui, les
  // rubriques restees vides.
  requiredHint: "Observation, Attendu et Contexte sont obligatoires.",

  // Renvoi depuis le dialogue d'edition, qui n'a qu'un champ libre
  editInPlace:
    "Ce type impose un rapport structuré : la description se modifie sur le ticket, dans la carte « Description ».",

  // Bascule entre le formulaire et le Markdown brut
  structuredTab: "Rubriques",
  freeformTab: "Markdown",
  freeformNotice:
    "Cette description ne suit pas le modèle : modifiez-la en Markdown, ou remplissez les rubriques pour la reprendre en main.",
  extraKept: "Le contenu placé après les rubriques est conservé tel quel.",
};

export type TicketTemplateDict = typeof ticketTemplate;
