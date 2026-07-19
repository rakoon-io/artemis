import type { AccountDict } from "../fr/account";

/** Namespace `account` (anglais). Meme structure de clefs que la version FR. */
export const account: AccountDict = {
  emailLabel: "Email",
  emailPlaceholder: "you@example.com",
  passwordMinHint: "At least 8 characters.",
  backToLogin: "Back to sign in",

  register: {
    title: "Create an account",
    description: "Join your Artemis workspace.",
    nameLabel: "Name",
    namePlaceholder: "First and last name",
    passwordLabel: "Password",
    submit: "Create my account",
    submitting: "Creating…",
    haveAccount: "Already have an account?",
    signIn: "Sign in",
    errorFailed: "Could not create your account.",
    successCreated: "Account created. Sign in to continue.",
    successWelcome: "Welcome to Artemis!",
  },

  reset: {
    title: "Forgot password",
    description:
      "Enter your email and we'll send you a link to set a new password.",
    submit: "Send the link",
    sentNotice:
      "If an account exists with this email, a reset link has just been sent. Remember to check your spam folder.",
  },

  activate: {
    invalidTitle: "Invalid or expired link",
    invalidDescription:
      "This first-login link is no longer valid. Ask an administrator for a new one.",
    title: "Set your password",
    description: "Choose a password to activate the account for {email}.",
    newPasswordLabel: "New password",
    confirmLabel: "Confirm password",
    submit: "Set password",
    errorMismatch: "Passwords do not match.",
    successSet: "Password set. You can now sign in.",
  },
};
