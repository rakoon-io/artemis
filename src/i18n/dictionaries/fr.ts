/**
 * Dictionnaire francais (langue de reference). La forme de cet objet definit le
 * type `Messages` ; `en.ts` doit en respecter exactement les clefs (verifie au
 * build). Les gabarits utilisent des {clefs} interpolees via `fmt`.
 */
export const fr = {
  common: {
    appName: "Artemis",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    create: "Creer",
    edit: "Modifier",
    loading: "Chargement…",
    search: "Rechercher",
    genericError: "Une erreur est survenue. Reessayez.",
  },
  userMenu: {
    menuLabel: "Menu utilisateur",
    roleAdmin: "Administrateur",
    roleReporter: "Rapporteur",
    users: "Utilisateurs",
    emails: "E-mails",
    signOut: "Se deconnecter",
    language: "Langue",
  },
  login: {
    title: "Connexion",
    subtitle: "Accedez a votre espace Artemis.",
    email: "E-mail",
    emailPlaceholder: "vous@exemple.com",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublie ?",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas encore de compte ?",
    createAccount: "Creer un compte",
    errorInvalid: "E-mail ou mot de passe incorrect.",
    success: "Connexion reussie.",
  },
  projects: {
    title: "Projets",
    subtitle: "Selectionnez un projet ou creez-en un nouveau.",
    emptyTitle: "Aucun projet pour l'instant",
    emptyAdmin: "Creez votre premier projet pour commencer a suivre des tickets.",
    emptyReporter:
      "Aucun projet n'est encore disponible. Contactez un administrateur.",
    done: "termines",
    ticketOne: "ticket",
    ticketOther: "tickets",
    sprintOne: "sprint",
    sprintOther: "sprints",
  },
} satisfies Record<string, Record<string, string>>;

export type Messages = typeof fr;
