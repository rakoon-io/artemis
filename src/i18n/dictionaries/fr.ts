import { account } from "./fr/account";
import { board } from "./fr/board";
import { tickets } from "./fr/tickets";
import { ticketForm } from "./fr/ticketForm";
import { ticketDetail } from "./fr/ticketDetail";
import { ticketTemplate } from "./fr/ticketTemplate";
import { aiTickets } from "./fr/aiTickets";
import { releases } from "./fr/releases";
import { sprints } from "./fr/sprints";
import { wiki } from "./fr/wiki";
import { settings } from "./fr/settings";
import { structure } from "./fr/structure";
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
    expand: "Agrandir",
    collapse: "Réduire",
    // Edition en place : un texte devient un champ au clic (titre et
    // description d'un ticket, nom et description des modules/composants).
    // `editAria` interpole {field} via `fmt`.
    inline: {
      editAria: "Modifier {field}",
      hint: "Entrée pour valider, Échap pour annuler",
      hintMultiline: "⌘/Ctrl + Entrée pour valider, Échap pour annuler",
      empty: "Ajouter…",
      required: "Ce champ ne peut pas être vide.",
      saved: "Modification enregistrée.",
    },
    loading: "Chargement…",
    search: "Rechercher",
    genericError: "Une erreur est survenue. Réessayez.",
    // Lu a voix haute avant « v0.1.0+46cc1f5 », que rien ne signale autrement
    // comme un numero de version.
    buildLabel: "Version",
  },
  // Page de repli servie par le service worker quand le reseau manque.
  offline: {
    title: "Pas de connexion",
    description:
      "Artemis a besoin du réseau pour afficher vos tickets. La page se rouvrira d'elle-même dès que la connexion reviendra ; vous pouvez aussi réessayer.",
  },
  userMenu: {
    menuLabel: "Menu utilisateur",
    roleAdmin: "Administrateur",
    roleReporter: "Rapporteur",
    users: "Utilisateurs",
    emails: "E-mails",
    instance: "Cette instance",
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
  // Bandeau « Mon activité », en tête de l'accueil : replié, la répartition ;
  // déplié, la chronologie. Les citations du wiki y comptent comme le reste.
  activity: {
    title: "Mon activité",
    total: "· {count} au total",
    todo: "À faire",
    doing: "En cours",
    done: "Terminés",
    wiki: "Citations",
    wikiBadge: "Wiki",
    // Neutre : la liste mêle des tickets (masculin) et des pages (féminin).
    recentFirst: "Du plus récent au plus ancien.",
    empty: "Rien ne vous est assigné et personne ne vous cite pour le moment.",
    more: "+ {count} de plus",
    // Nom du bouton de pli, pour ne pas lire tout le bloc d'un trait.
    toggleAria: "Mon activité : afficher ou masquer le détail",
    // Lu à voix haute à la place de la barre, qu'un lecteur d'écran ne voit pas.
    // Aucun nom accordé au nombre : `{detail}` porte déjà « 3 en cours », etc.
    chartAria: "Répartition de mon activité : {detail}.",
  },
  account,
  board,
  tickets,
  ticketForm,
  ticketDetail,
  ticketTemplate,
  aiTickets,
  releases,
  sprints,
  wiki,
  settings,
  structure,
  taxonomy,
  admin,
};

export type Messages = typeof fr;
