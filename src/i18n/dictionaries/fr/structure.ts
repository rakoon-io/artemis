/**
 * Namespace `structure` : page « Structure » d'un projet, en lecture seule pour
 * tous les membres (rapporteurs compris). Elle expose le catalogue des modules
 * fonctionnels et des composants, permet a chacun d'en proposer de nouveaux et
 * aux administrateurs de valider ou refuser ces propositions. Une proposition
 * reste invisible ailleurs (selecteurs de ticket, contexte IA, MCP) tant qu'un
 * administrateur ne l'a pas validee ; la refuser la supprime.
 *
 * Ne contient que du texte visible ; les valeurs metier (noms et descriptions
 * des modules et composants, noms des auteurs) restent en base et ne sont pas
 * traduites. Les gabarits interpolent {name} via `fmt`.
 */
export const structure = {
  // En-tete de la page
  title: "Structure",
  subtitle:
    "Les modules fonctionnels et les composants de ce projet. Chaque membre peut en proposer de nouveaux.",
  // Affiche aux rapporteurs, qui consultent la page sans pouvoir la configurer
  readOnlyNotice:
    "La configuration de la structure est réservée aux administrateurs, mais vous pouvez proposer un module ou un composant : il sera soumis à validation.",

  // Sections du catalogue
  modulesHeading: "Modules fonctionnels",
  componentsHeading: "Composants de l'application",
  // Composants rattaches a aucun module
  transverseHeading: "Composants transverses",
  emptyModules: "Aucun module déclaré.",
  emptyComponents: "Aucun composant déclaré.",

  // Proposition d'un module ou d'un composant (boutons + dialogues)
  proposeModule: "Proposer un module",
  proposeComponent: "Proposer un composant",
  proposeModuleTitle: "Proposer un module",
  proposeModuleDescription:
    "Votre proposition sera soumise à un administrateur : le module ne sera utilisable sur les tickets qu'une fois validé.",
  proposeComponentTitle: "Proposer un composant",
  proposeComponentDescription:
    "Votre proposition sera soumise à un administrateur : le composant ne sera utilisable sur les tickets qu'une fois validé.",
  submitProposal: "Envoyer la proposition",
  proposalSent: "Proposition envoyée : un administrateur doit la valider.",

  // File des propositions en attente (moderation par les administrateurs)
  pendingHeading: "Propositions en attente",
  pendingEmpty: "Aucune proposition en attente.",
  pendingBadge: "Proposé",
  proposedBy: "Proposé par {name}",
  approve: "Valider",
  reject: "Refuser",
  approveAria: "Valider « {name} »",
  rejectAria: "Refuser « {name} »",
  approved: "« {name} » validé.",
  rejected: "« {name} » refusé.",
  rejectHint: "Refuser supprime définitivement la proposition.",
};

export type StructureDict = typeof structure;
