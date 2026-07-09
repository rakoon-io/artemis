# SPEC-0001 — Création rapide de ticket ⭐
- **Statut** : Rédigée (v1)
- **Rôles concernés** : Admin · Rapporteur

## Objectif

Créer un **Ticket** sans friction : seul le **titre** est obligatoire, le reste est optionnel et
pré-rempli. La fonction phare est le **collage de pièce jointe** (image du presse-papier, log, texte)
depuis le formulaire. Objectif mesurable : un **Rapporteur** crée un ticket **avec image collée en
moins de 30 secondes**.

## User stories

- En tant que **Rapporteur**, je veux créer un ticket en saisissant seulement un titre afin de
  signaler un problème immédiatement.
- En tant que **Rapporteur**, je veux **coller une capture d'écran** (⌘/Ctrl+V) afin d'illustrer un
  bug sans explorateur de fichiers.
- En tant que **Rapporteur**, je veux coller un **log** ou du **texte** afin de joindre le contexte
  technique en une action.
- En tant qu'**Admin**, je veux que chaque ticket reçoive une **clé lisible** (`RKN-123`) afin de le
  référencer facilement.

## Critères d'acceptation

- [ ] Le champ **titre** est obligatoire ; sans titre, le bouton « Créer » reste désactivé.
- [ ] Étant donné un formulaire vierge, Quand je ne renseigne que le titre, Alors le ticket est créé
      avec les défauts : `type = TASK`, `priority = MEDIUM`, aucun assigné, aucun label, aucun sprint.
- [ ] Étant donné un ticket créé, Quand il est enregistré, Alors il apparaît dans la **première
      colonne** du workflow (colonne d'`order` minimal) avec un `rank` valide.
- [ ] Étant donné une image dans le presse-papier, Quand je colle dans la zone dédiée, Alors une
      **vignette d'aperçu** s'affiche puis la pièce jointe est téléversée et liée au ticket.
- [ ] Le ticket reçoit une **clé** unique `RKN-<n>` séquentielle par projet (`@@unique([projectId, key])`).
- [ ] Le **reporter** du ticket est l'utilisateur connecté.
- [ ] Étant donné un rapporteur entraîné, Quand il crée un ticket avec image collée, Alors le
      parcours complet (ouvrir → titre → coller → créer) tient en **< 30 s** (test e2e chronométré).

## Règles & comportements

- **Valeurs par défaut** : `type = TASK`, `priority = MEDIUM`, `reporterId = utilisateur courant`,
  `columnId = première colonne`, `sprintId = null`, `assigneeId = null`.
- **Paste-first** : le client capture le presse-papier, demande une **URL presignée** (le serveur
  vérifie les droits), téléverse vers le stockage **S3-compatible**, puis enregistre l'`Attachment`
  (`filename`, `contentType`, `size`, `storageKey`).
- **Types de collage** : image (`image/png`, `image/jpeg`…) → fichier ; texte / log (`text/plain`)
  → pièce jointe **ou** insertion dans la description (au choix de l'utilisateur).
- **Clé de ticket** : générée côté serveur, séquence par projet, jamais réutilisée.
- **Validation** : schéma **Zod** partagé client/serveur ; titre borné (1–200 caractères).

## Cas limites

- **Collage vide** : presse-papier sans contenu exploitable → message informatif, aucune pièce
  jointe, pas d'erreur bloquante.
- **Fichier trop lourd** : au-delà de la limite (ex. 10 Mo) → rejet **avant** upload, message
  indiquant la taille maximale.
- **Type non supporté** : `contentType` hors liste autorisée → refus explicite, le reste du
  formulaire reste utilisable.
- **Perte de connexion pendant l'upload** : échec propre avec possibilité de **réessayer** la pièce
  jointe ; le ticket peut être créé sans elle (saisie conservée). Un anti-rebond évite la double
  soumission.

## Hors périmètre (v1)

- Notifications à la création (e-mail).
- Détection automatique de doublons / suggestions IA.
- Champs personnalisés au-delà du modèle canonique.
- Édition collaborative temps réel du formulaire.

## Références

- Spec produit : [`../../SPEC.md`](../../SPEC.md) (§ 3.1)
- Architecture / modèle de données : [`../architecture.md`](../architecture.md#modèle-de-données-canonique)
- Vision (proposition de valeur, « Done ») : [`../vision.md`](../vision.md)
- ADR pièces jointes « paste-first » : [`../decisions/0004-pieces-jointes-paste-first.md`](../decisions/0004-pieces-jointes-paste-first.md)
- Specs liées : [`./0002-vue-kanban.md`](./0002-vue-kanban.md) · [`./0004-roles-et-permissions.md`](./0004-roles-et-permissions.md)
