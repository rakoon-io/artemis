import { account } from "./fr/account";
import { board } from "./fr/board";
import { tickets } from "./fr/tickets";
import { ticketForm } from "./fr/ticketForm";
import { ticketDetail } from "./fr/ticketDetail";
import { sprints } from "./fr/sprints";
import { wiki } from "./fr/wiki";
import { settings } from "./fr/settings";
import { taxonomy } from "./fr/taxonomy";
import { admin } from "./fr/admin";

/**
 * Dictionnaire francais (langue de reference). La forme de cet objet definit le
 * type `Messages` ; `en.ts` doit en respecter exactement les clefs (verifie au
 * build). Les gabarits utilisent des {clefs} interpolees via `fmt`.
 *
 * Les namespaces transverses (common, userMenu, login, projects) sont definis
 * ici ; les namespaces par fonctionnalite sont importes depuis ./fr/*.
 */
export const fr = {
  common: {
    appName: "Artemis",
    save: "Enregistrer",
    cancel: "Annuler",
    delete: "Supprimer",
    create: "Créer",
    edit: "Modifier",
    loading: "Chargement…",
    search: "Rechercher",
    genericError: "Une erreur est survenue. Réessayez.",
  },
  userMenu: {
    menuLabel: "Menu utilisateur",
    roleAdmin: "Administrateur",
    roleReporter: "Rapporteur",
    users: "Utilisateurs",
    emails: "E-mails",
    signOut: "Se déconnecter",
    language: "Langue",
  },
  login: {
    title: "Connexion",
    subtitle: "Accédez à votre espace Artemis.",
    email: "E-mail",
    emailPlaceholder: "vous@exemple.com",
    password: "Mot de passe",
    forgotPassword: "Mot de passe oublié ?",
    submit: "Se connecter",
    submitting: "Connexion…",
    noAccount: "Pas encore de compte ?",
    createAccount: "Créer un compte",
    errorInvalid: "E-mail ou mot de passe incorrect.",
    success: "Connexion réussie.",
  },
  projects: {
    title: "Projets",
    subtitle: "Sélectionnez un projet ou créez-en un nouveau.",
    emptyTitle: "Aucun projet pour l'instant",
    emptyAdmin: "Créez votre premier projet pour commencer à suivre des tickets.",
    emptyReporter:
      "Aucun projet n'est encore disponible. Contactez un administrateur.",
    done: "terminés",
    ticketOne: "ticket",
    ticketOther: "tickets",
    sprintOne: "sprint",
    sprintOther: "sprints",
  },
  account,
  board,
  tickets,
  ticketForm,
  ticketDetail,
  sprints,
  wiki,
  settings,
  taxonomy,
  admin,
};

export type Messages = typeof fr;
