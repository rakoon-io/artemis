import type { AdminDict } from "../fr/admin";

/** Namespace `admin` (anglais). Meme structure de clefs que la version FR. */
export const admin: AdminDict = {
  // Shared access guard for both pages
  restrictedTitle: "Access reserved for administrators",

  instance: {
    restrictedDescription:
      "This instance's appearance can only be set by an administrator.",
    title: "This instance",
    subtitle:
      "What tells this deployment from the others: a label and a colour, carried by the installed app's icon.",
    cardTitle: "Label and colour",
    cardDescription:
      "Two installs of the same product look alike in the dock, and standalone mode removes the address bar. The label appears on the icon, in the app name and next to the brand.",

    labelField: "Label",
    labelPlaceholder: "Staging",
    labelHint: "Leave empty for the reference instance: no badge, no mention in the name.",
    labelInherited: "Empty = “{value}”, inherited from the environment.",

    colorField: "Colour",
    colorPlaceholder: "#c2410c",
    colorHint: "Leave empty for the brand colour.",
    colorInherited: "Empty = {value}, inherited from the environment.",
    colorInvalid: "Expected a hex colour (e.g. #c2410c).",

    preview: "Preview",
    current: "Served icon",
    installedHint:
      "Existing installs refresh the icon at their own pace; iOS only picks it up after reinstalling.",
    saved: "Appearance saved.",
  },

  users: {
    // Page
    restrictedDescription:
      "User management is only accessible to administrators.",
    title: "Users",
    subtitle:
      "Accounts and roles, valid across all of Artemis. Access to each project is set in its settings, Members tab.",
    cardTitle: "Users & roles",
    cardDescription:
      "Add accounts, change roles (Administrator / Reporter) or delete users. These accounts are global.",

    // Roles
    roleAdmin: "Administrator",
    roleReporter: "Reporter",

    // List
    empty: "No users.",
    roleSelectLabel: "Role for {name}",
    roleUpdated: "Role updated.",

    // Login-link resend button
    setupLinkAria: "Login link for {name}",
    setupLinkTitle: "Send a first-login / password-reset link",
    setupLinkSentToast: "Link sent by email.",
    setupLinkGeneratedToast: "Link generated (copy it).",

    // Deletion
    deleteAria: "Delete {name}",
    deleteSelfTitle: "You cannot delete your own account.",
    deleteTitle: 'Delete "{name}"?',
    deleteDescription:
      "This action is permanent: the user will lose access to Artemis.",
    deletedToast: 'User "{name}" deleted.',

    // "First-login link" dialog
    setupTitle: "First-login link",
    setupDescriptionSent:
      "An email has been sent to {email}. You can also copy the link.",
    setupDescriptionManual:
      "Copy this link and send it to {email}. Email sending is not configured.",
    copy: "Copy",
    copied: "Copied",
    copyError: "Could not copy. Select the link manually.",
    setupHint: "This link is valid for 7 days and single-use.",
    close: "Close",

    // "Add a user" dialog (trigger + title)
    addUser: "Add a user",
    addUserDescription: "Create an account and assign a role.",
    nameLabel: "Name",
    emailLabel: "Email",
    passwordLabel: "Password",
    passwordHint:
      "Leave blank to send a first-login link (the user chooses their own password).",
    roleLabel: "Role",
    validationMissing: "Enter a name and an email.",
    validationPasswordShort: "The password must be at least 8 characters.",
    createdWithLinkToast: '"{name}" created. First-login link generated.',
    createdToast: 'User "{name}" created.',
  },

  emails: {
    // Page
    restrictedDescription: "The email log is only accessible to administrators.",
    title: "Emails",
    subtitle:
      'Overview of all emails sent by Artemis. The "Disabled" status means Mailjet is not configured: the email would have been sent once the keys are set.',
    empty: "No emails yet.",

    // Table headers
    colDate: "Date",
    colRecipient: "Recipient",
    colSubject: "Subject",
    colType: "Type",
    colStatus: "Status",

    // Status labels
    statusSent: "Sent",
    statusFailed: "Failed",
    statusDisabled: "Disabled",

    // Notification type labels
    typeComment: "Comment",
    typeAssignment: "Assignment",
    typeInvite: "Invitation",
    typeReset: "Password reset",
  },
};
