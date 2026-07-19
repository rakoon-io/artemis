/**
 * Namespace `settings` : reglages d'un projet (onglets de navigation, page de
 * reglages, formulaire d'edition, dialogue de creation). Ne contient que du
 * texte visible ; les valeurs metier (nom et cle du projet) restent en base et
 * ne sont pas traduites.
 */
export const settings = {
  // Onglets de navigation du projet (project-nav.tsx)
  nav: {
    board: "Tableau",
    tickets: "Tickets",
    sprints: "Sprints",
    wiki: "Wiki",
    settings: "Paramètres",
    ariaLabel: "Navigation du projet",
  },

  // En-tete de la page de reglages (settings/page.tsx)
  pageTitle: "{name} - Paramètres",
  pageSubtitle:
    "Éditez le projet, personnalisez le workflow (colonnes, labels, types, priorités) et gérez ses membres.",
  adminOnlyTitle: "Accès réservé aux administrateurs",
  adminOnlyDescription:
    "Les paramètres du projet ne sont accessibles qu'aux administrateurs.",

  // Onglets de la page de reglages
  tabs: {
    project: "Projet",
    columns: "Colonnes",
    labels: "Labels",
    types: "Types",
    priorities: "Priorités",
    members: "Membres",
  },

  // Cartes de chaque onglet (titre + description)
  projectCardTitle: "Projet",
  projectCardDescription: "Modifiez le nom et la description du projet.",
  columnsCardTitle: "Colonnes du workflow",
  columnsCardDescription:
    "Réordonnez, renommez, limitez l'en-cours (WIP) ou supprimez les colonnes du tableau Kanban.",
  labelsCardTitle: "Labels",
  labelsCardDescription:
    "Créez des labels colorés pour catégoriser les tickets, ou supprimez ceux qui ne servent plus.",
  typesCardTitle: "Types de ticket",
  typesCardDescription:
    "Définissez les types de ticket (nom + couleur), réordonnez-les ou supprimez ceux qui ne servent plus.",
  prioritiesCardTitle: "Priorités",
  prioritiesCardDescription:
    "Définissez les priorités (nom + couleur), réordonnez-les ou supprimez celles qui ne servent plus.",
  membersCardTitle: "Membres du projet",
  membersCardDescription:
    "Donnez ou retirez l'accès à ce projet, utilisateur par utilisateur. Les administrateurs accèdent à tous les projets.",

  // Formulaire d'edition du projet (project-settings-form.tsx)
  form: {
    nameLabel: "Nom",
    descriptionLabel: "Description",
    descriptionPlaceholder: "Description du projet (optionnel)",
    accentLabel: "Couleur d'accent",
    accentAriaLabel: "Couleur d'accent du projet",
    accentDefaultSuffix: "(par défaut)",
    accentReset: "Réinitialiser",
    accentHint:
      "Personnalise la couleur principale des boutons et surbrillances du projet. « Réinitialiser » rétablit l'accent par défaut.",
    nameRequired: "Le nom est requis.",
    updated: "Projet mis à jour.",
  },

  // Dialogue de creation de projet (create-project-dialog.tsx)
  create: {
    trigger: "Nouveau projet",
    title: "Nouveau projet",
    description: "La clé préfixe les tickets du projet (ex : RKN-1).",
    nameLabel: "Nom",
    keyLabel: "Clé",
    keyHint: "2 à 6 lettres majuscules.",
    descriptionLabel: "Description (optionnel)",
    descriptionPlaceholder: "Objet du projet…",
    submit: "Créer le projet",
    submitting: "Création…",
    created: "Projet {key} créé.",
  },
};

export type SettingsDict = typeof settings;
