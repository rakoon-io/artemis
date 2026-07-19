/**
 * Namespace `admin` : espaces d'administration (RSC + client). Regroupe la page
 * Utilisateurs (comptes, roles, lien de premiere connexion) et la page E-mails
 * (journal des envois). Seul le texte visible est traduit ; les valeurs metier
 * (e-mails, noms, sujets, types) restent en base et ne sont pas traduites.
 */
export const admin = {
  // Garde d'acces partagee par les deux pages
  restrictedTitle: "Accès réservé aux administrateurs",

  users: {
    // Page
    restrictedDescription:
      "La gestion des utilisateurs n'est accessible qu'aux administrateurs.",
    title: "Utilisateurs",
    subtitle:
      "Comptes et rôles, valables sur l'ensemble d'Artemis. L'accès à chaque projet se règle dans ses paramètres, onglet Membres.",
    cardTitle: "Utilisateurs & rôles",
    cardDescription:
      "Ajoutez des comptes, changez les rôles (Administrateur / Rapporteur) ou supprimez des utilisateurs. Ces comptes sont globaux.",

    // Roles
    roleAdmin: "Administrateur",
    roleReporter: "Rapporteur",

    // Liste
    empty: "Aucun utilisateur.",
    roleSelectLabel: "Rôle de {name}",
    roleUpdated: "Rôle mis à jour.",

    // Bouton de relance du lien de connexion
    setupLinkAria: "Lien de connexion pour {name}",
    setupLinkTitle: "Envoyer un lien de première connexion / réinitialisation",
    setupLinkSentToast: "Lien envoyé par e-mail.",
    setupLinkGeneratedToast: "Lien généré (à copier).",

    // Suppression
    deleteAria: "Supprimer {name}",
    deleteSelfTitle: "Vous ne pouvez pas supprimer votre propre compte.",
    deleteTitle: "Supprimer « {name} » ?",
    deleteDescription:
      "Cette action est définitive : l'utilisateur perdra l'accès à Artemis.",
    deletedToast: "Utilisateur « {name} » supprimé.",

    // Dialogue « lien de première connexion »
    setupTitle: "Lien de première connexion",
    setupDescriptionSent:
      "Un e-mail a été envoyé à {email}. Vous pouvez aussi copier le lien.",
    setupDescriptionManual:
      "Copiez ce lien et transmettez-le à {email}. L'envoi d'e-mail n'est pas configuré.",
    copy: "Copier",
    copied: "Copié",
    copyError: "Copie impossible. Sélectionnez le lien manuellement.",
    setupHint: "Ce lien est valable 7 jours et à usage unique.",
    close: "Fermer",

    // Dialogue « ajouter un utilisateur » (déclencheur + titre)
    addUser: "Ajouter un utilisateur",
    addUserDescription: "Créez un compte et attribuez-lui un rôle.",
    nameLabel: "Nom",
    emailLabel: "E-mail",
    passwordLabel: "Mot de passe",
    passwordHint:
      "Laissez vide pour envoyer un lien de première connexion (l'utilisateur choisit son mot de passe).",
    roleLabel: "Rôle",
    validationMissing: "Renseignez un nom et un e-mail.",
    validationPasswordShort: "Le mot de passe doit faire 8 caractères minimum.",
    createdWithLinkToast: "« {name} » créé. Lien de première connexion généré.",
    createdToast: "Utilisateur « {name} » créé.",
  },

  emails: {
    // Page
    restrictedDescription:
      "Le journal des e-mails n'est accessible qu'aux administrateurs.",
    title: "E-mails",
    subtitle:
      "Suivi de tous les e-mails envoyés par Artemis. Le statut « Désactivé » signifie que Mailjet n'est pas configuré : l'e-mail aurait été envoyé une fois les clés renseignées.",
    empty: "Aucun e-mail pour l'instant.",

    // En-têtes de tableau
    colDate: "Date",
    colRecipient: "Destinataire",
    colSubject: "Sujet",
    colType: "Type",
    colStatus: "Statut",

    // Libellés de statut
    statusSent: "Envoyé",
    statusFailed: "Échec",
    statusDisabled: "Désactivé",

    // Libellés de type de notification
    typeComment: "Commentaire",
    typeAssignment: "Assignation",
    typeInvite: "Invitation",
    typeReset: "Réinitialisation",
  },
};

export type AdminDict = typeof admin;
