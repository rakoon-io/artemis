import type { Messages } from "./fr";
import { account } from "./en/account";
import { board } from "./en/board";
import { tickets } from "./en/tickets";
import { ticketForm } from "./en/ticketForm";
import { ticketDetail } from "./en/ticketDetail";
import { sprints } from "./en/sprints";
import { wiki } from "./en/wiki";
import { settings } from "./en/settings";
import { taxonomy } from "./en/taxonomy";
import { admin } from "./en/admin";

/**
 * Dictionnaire anglais. Type `Messages` : toute clef manquante ou en trop par
 * rapport a `fr` provoque une erreur de compilation.
 */
export const en: Messages = {
  common: {
    appName: "Artemis",
    save: "Save",
    cancel: "Cancel",
    delete: "Delete",
    create: "Create",
    edit: "Edit",
    loading: "Loading…",
    search: "Search",
    genericError: "Something went wrong. Please try again.",
  },
  userMenu: {
    menuLabel: "User menu",
    roleAdmin: "Administrator",
    roleReporter: "Reporter",
    users: "Users",
    emails: "Emails",
    signOut: "Sign out",
    language: "Language",
  },
  login: {
    title: "Sign in",
    subtitle: "Access your Artemis workspace.",
    email: "Email",
    emailPlaceholder: "you@example.com",
    password: "Password",
    forgotPassword: "Forgot password?",
    submit: "Sign in",
    submitting: "Signing in…",
    noAccount: "Don't have an account yet?",
    createAccount: "Create an account",
    errorInvalid: "Incorrect email or password.",
    success: "Signed in successfully.",
  },
  projects: {
    title: "Projects",
    subtitle: "Select a project or create a new one.",
    emptyTitle: "No projects yet",
    emptyAdmin: "Create your first project to start tracking tickets.",
    emptyReporter: "No projects are available yet. Contact an administrator.",
    done: "done",
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
