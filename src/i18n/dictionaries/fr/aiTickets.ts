/**
 * Namespace `aiTickets` : dialogue « Creer depuis un texte » (generation de
 * tickets par l'IA) en deux etapes, saisie du texte puis revue des brouillons
 * suggeres. Ne contient que du texte visible ; les valeurs metier (titres
 * suggeres, noms de type / priorite / composant, cles de tickets) ne sont pas
 * traduites. Les gabarits interpoles utilisent {project}/{index}/{count}/{key}
 * via `fmt`.
 */
export const aiTickets = {
  // Declencheur
  trigger: "Créer depuis un texte",

  // Etape 1 : saisie du texte
  inputTitle: "Créer des tickets depuis un texte",
  inputDescription:
    "Collez vos notes de réunion, un compte-rendu, un e-mail ou une liste de tâches. L'IA (Mistral) en propose un ou plusieurs tickets que vous relirez avant création.",
  textLabel: "Texte",
  textPlaceholder: "Collez ici le texte à transformer en tickets…",
  textHint:
    "Aucun ticket n'est créé à cette étape : vous pourrez tout ajuster ensuite.",
  analyze: "Analyser le texte",
  analyzing: "Analyse…",
  pasteFirst: "Collez d'abord un texte à analyser.",
  noneSuggested: "Aucun ticket n'a pu être suggéré depuis ce texte.",

  // Champ de contexte facultatif
  contextLabel: "Contexte / consignes (facultatif)",
  contextPlaceholder:
    "Ex. : audience technique, module concerné, style des titres, priorité par défaut…",
  contextDescription:
    "Le contexte du projet « {project} » (nom, description, composants) est pris en compte automatiquement. Ajoutez ici des consignes propres à cette demande.",

  // Etape 2 : revue des brouillons
  reviewTitle: "Revue des tickets suggérés",
  reviewDescription:
    "Relisez et modifiez chaque ticket, retirez ceux qui ne conviennent pas, puis validez.",
  reviewEmpty:
    "Vous avez retiré tous les tickets. Revenez en arrière pour analyser un autre texte.",
  ticketIndex: "Ticket {index}",
  removeAria: "Retirer ce ticket",

  // Champs d'un brouillon
  titleLabel: "Titre",
  titlePlaceholder: "Titre du ticket",
  descriptionLabel: "Description",
  descriptionPlaceholder: "Détails (facultatif)",
  typeLabel: "Type",
  priorityLabel: "Priorité",
  componentLabel: "Composant",
  noComponent: "Aucun composant",
  selectPlaceholder: "Sélectionner…",

  // Actions et notifications
  back: "Retour",
  titleRequired: "Ajoutez un titre à au moins un ticket.",
  createOne: "Créer le ticket",
  createMany: "Créer {count} tickets",
  createdOne: "Ticket {key} créé.",
  createdMany: "{count} tickets créés.",
};

export type AiTicketsDict = typeof aiTickets;
