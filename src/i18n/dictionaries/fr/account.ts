/**
 * Namespace `account` : parcours publics de compte (inscription, mot de passe
 * oublie, premiere connexion). Les clefs partagees entre plusieurs formulaires
 * sont a la racine ; les clefs propres a un ecran sont regroupees.
 */
export const account = {
  emailLabel: "E-mail",
  emailPlaceholder: "vous@exemple.com",
  passwordMinHint: "8 caractères minimum.",
  backToLogin: "Retour à la connexion",

  register: {
    title: "Créer un compte",
    description: "Rejoignez votre espace Artemis.",
    nameLabel: "Nom",
    namePlaceholder: "Prénom Nom",
    passwordLabel: "Mot de passe",
    submit: "Créer mon compte",
    submitting: "Création…",
    haveAccount: "Déjà un compte ?",
    signIn: "Se connecter",
    errorFailed: "Inscription impossible.",
    successCreated: "Compte créé. Connectez-vous pour continuer.",
    successWelcome: "Bienvenue sur Artemis !",
  },

  reset: {
    title: "Mot de passe oublié",
    description:
      "Saisissez votre e-mail : nous vous enverrons un lien pour définir un nouveau mot de passe.",
    submit: "Envoyer le lien",
    sentNotice:
      "Si un compte existe avec cet e-mail, un lien de réinitialisation vient d'être envoyé. Pensez à vérifier vos indésirables.",
  },

  activate: {
    invalidTitle: "Lien invalide ou expiré",
    invalidDescription:
      "Ce lien de première connexion n'est plus valable. Demandez-en un nouveau à un administrateur.",
    title: "Définir votre mot de passe",
    description: "Choisissez un mot de passe pour activer le compte {email}.",
    newPasswordLabel: "Nouveau mot de passe",
    confirmLabel: "Confirmer le mot de passe",
    submit: "Définir le mot de passe",
    errorMismatch: "Les mots de passe ne correspondent pas.",
    successSet: "Mot de passe défini. Vous pouvez vous connecter.",
  },
};

export type AccountDict = typeof account;
