/**
 * Namespace `ticketForm` : dialogues de creation / edition de ticket, selecteur
 * de labels multiple et champ de pieces jointes. Ne contient que du texte
 * visible ; les valeurs metier (noms de type, priorite, label, sprint, membres)
 * restent en base et ne sont pas traduites.
 */
export const ticketForm = {
  // Champs partages (creation + edition)
  titleLabel: "Titre",
  titlePlaceholder: "Résumé court du ticket",
  descriptionLabel: "Description",
  descriptionPlaceholderCreate:
    "Détails (facultatif). Coller une image ici l'ajoute en pièce jointe.",
  descriptionPlaceholderEdit: "Coller une image ici l'ajoute en pièce jointe.",
  typeLabel: "Type",
  priorityLabel: "Priorité",
  assigneeLabel: "Assigné à",
  sprintLabel: "Sprint",
  selectPlaceholder: "Sélectionner…",
  noAssignee: "Personne",
  backlogOption: "Backlog (aucun sprint)",
  labelsLabel: "Labels",
  titleRequired: "Le titre est requis.",

  // Dialogue de creation
  newTicket: "Nouveau ticket",
  createDescription:
    "Un titre suffit. Collez une capture ou un log directement : ils deviennent des pièces jointes.",
  submitCreate: "Créer le ticket",
  unexpectedResponse: "Réponse inattendue du serveur.",
  createdToast: "Ticket {key} créé.",

  // Dialogue d'edition
  edit: "Éditer",
  editTitle: "Éditer le ticket",
  editDescription: "Modifiez les champs puis enregistrez.",
  updatedToast: "Ticket mis à jour.",

  // Selecteur de labels
  noLabelsAvailable: "Aucun label disponible",
  selectLabels: "Sélectionner des labels…",
  labelsSelectedOne: "{count} label sélectionné",
  labelsSelectedOther: "{count} labels sélectionnés",

  // Champ pieces jointes
  attachmentsLabel: "Pièces jointes",
  pastePlaceholder: "Collez (Ctrl/Cmd + V) une image, un log ou du texte…",
  pasteZoneAria: "Zone de collage de pièces jointes",
  dropHint: "…ou glissez-déposez vos documents ici.",
  browse: "Parcourir…",
  textDetectedOne: "Texte détecté ({count} caractère).",
  textDetectedOther: "Texte détecté ({count} caractères).",
  attachAsTxt: "En pièce jointe (.txt)",
  insertIntoDescription: "Insérer dans la description",
  ignore: "Ignorer",
  pendingAttachments: "Pièces jointes en attente ({count})",
  removeAttachment: "Retirer {name}",

  // Notifications pieces jointes
  attachmentsAddedOne: "Pièce jointe ajoutée.",
  attachmentsAddedOther: "{count} pièces jointes ajoutées.",
  textAttached: "Texte ajouté en pièce jointe.",
  imagesAddedOne: "Image ajoutée en pièce jointe.",
  imagesAddedOther: "{count} images ajoutées.",
};

export type TicketFormDict = typeof ticketForm;
