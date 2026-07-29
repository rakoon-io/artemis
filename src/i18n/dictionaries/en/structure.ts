import type { StructureDict } from "../fr/structure";

/**
 * Namespace `structure` (anglais). Memes clefs que ../fr/structure ; seules les
 * valeurs sont traduites. Les marqueurs interpoles sont conserves a l'identique.
 */
export const structure: StructureDict = {
  // Page header
  title: "Structure",
  subtitle:
    "The functional modules and components of this project. Any member can propose new ones.",
  // Shown to reporters, who can read the page but not configure it
  readOnlyNotice:
    "Configuring the structure is reserved for administrators, but you can propose a module or a component: it will be submitted for approval.",

  // Catalogue sections
  modulesHeading: "Functional modules",
  componentsHeading: "Application components",
  // Components attached to no module
  transverseHeading: "Cross-cutting components",
  emptyModules: "No modules declared yet.",
  emptyComponents: "No components declared yet.",

  // Proposing a module or a component (buttons + dialogs)
  proposeModule: "Propose a module",
  proposeComponent: "Propose a component",
  proposeModuleTitle: "Propose a module",
  proposeModuleDescription:
    "Your proposal will be submitted to an administrator: the module can only be used on tickets once it has been approved.",
  proposeComponentTitle: "Propose a component",
  proposeComponentDescription:
    "Your proposal will be submitted to an administrator: the component can only be used on tickets once it has been approved.",
  submitProposal: "Submit proposal",
  proposalSent: "Proposal sent: an administrator must approve it.",

  // Pending proposals queue (moderated by administrators)
  pendingHeading: "Pending proposals",
  pendingEmpty: "No pending proposals.",
  pendingBadge: "Proposed",
  proposedBy: "Proposed by {name}",
  approve: "Approve",
  reject: "Reject",
  approveAria: "Approve “{name}”",
  rejectAria: "Reject “{name}”",
  approved: "“{name}” approved.",
  rejected: "“{name}” rejected.",
  rejectHint: "Rejecting permanently deletes the proposal.",
};
