import type { Messages } from "./fr";

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
};
