# 📘 SPEC — Rakoon Tracker

> Cible produit détaillée de la **v1**. La direction générale est fixée par
> [`.ai/vision.md`](./.ai/vision.md) (North Star) ; le **modèle de données** de référence vit dans
> [`.ai/architecture.md`](./.ai/architecture.md). Ce document décrit **quoi** construire ; le
> **comment** technique est dans `.ai/architecture.md`.

---

## 1. Résumé

Rakoon Tracker est un **outil interne de suivi de tickets** sobre, moderne, efficace et
personnalisable, adapté à une **méthode agile** (backlog, sprints/lots, Kanban). L'accent est mis
sur une **création de ticket sans friction** (pièce jointe par copier-coller) et un **flux de
travail configurable**.

## 2. Personas & rôles

| Persona | Rôle | Besoins principaux |
|---------|------|--------------------|
| **Admin** (chef de projet / lead) | `ADMIN` | Configurer projets, colonnes, sprints, labels, utilisateurs ; suivre l'ensemble des tickets ; personnaliser le workflow. |
| **Rapporteur** (membre / testeur) | `REPORTER` | Créer un ticket très vite avec une pièce jointe ; suivre et commenter ses tickets. |

### 2.1 Matrice de permissions

| Action | Admin | Rapporteur |
|--------|:-----:|:----------:|
| Créer un ticket | ✅ | ✅ |
| Voir les tickets de ses projets | ✅ | ✅ |
| Commenter un ticket | ✅ | ✅ |
| Éditer **ses** tickets | ✅ | ✅ |
| Éditer **tout** ticket / réassigner / changer le statut d'autrui | ✅ | ❌ |
| Déplacer une carte en Kanban | ✅ | ⚠️ ses tickets uniquement |
| Gérer les colonnes / workflow | ✅ | ❌ |
| Créer / gérer les sprints & lots | ✅ | ❌ |
| Gérer les labels | ✅ | ❌ |
| Gérer les utilisateurs & rôles | ✅ | ❌ |
| Supprimer un ticket / projet | ✅ | ❌ |
| Paramètres & personnalisation du projet | ✅ | ❌ |

> Règle d'or : **l'UI masque, le serveur impose.** Toute action passe par une policy RBAC serveur.

## 3. Fonctionnalités (v1)

### 3.1 Création rapide de ticket ⭐ (fonction phare)
- Formulaire minimal : **titre obligatoire** ; le reste (description, type, priorité, assigné,
  labels, sprint) est **optionnel** et pré-rempli par des valeurs par défaut.
- **Pièce jointe par copier-coller** : coller une **image** du presse-papier, un **fichier de log**
  ou du **texte** directement dans le formulaire (zone de collage dédiée).
- Le ticket reçoit une **clé** lisible (`RKN-123`) et arrive dans la première colonne du workflow.
- Critère : un rapporteur crée un ticket **avec image collée en < 30 s**.
- Détail : [`.ai/specs/0001-creation-ticket-rapide.md`](./.ai/specs/0001-creation-ticket-rapide.md)

### 3.2 Vue Kanban
- Colonnes = statuts **configurables** par projet ; cartes = tickets.
- **Drag & drop** (souris + **clavier**, via dnd-kit) pour déplacer/réordonner ; persistance de
  l'ordre via `rank` (lexorank).
- Filtres rapides (assigné, label, type, priorité, sprint) et limite d'en-cours (WIP) optionnelle.
- Détail : [`.ai/specs/0002-vue-kanban.md`](./.ai/specs/0002-vue-kanban.md)

### 3.3 Vue liste
- Table dense : clé, titre, type, priorité, statut, assigné, sprint, labels, dates.
- **Filtres**, **tri** multi-colonnes et **recherche** plein texte (titre/description).
- Détail : [`.ai/specs/0005-vue-liste.md`](./.ai/specs/0005-vue-liste.md)

### 3.4 Sprints / lots
- Créer un **lot** (regroupement) ou un **sprint** (lot **daté** : `startDate`/`endDate`, objectif).
- Backlog → planification (glisser des tickets dans un sprint) → sprint actif → clôturé.
- Détail : [`.ai/specs/0003-sprints-et-lots.md`](./.ai/specs/0003-sprints-et-lots.md)

### 3.5 Personnalisation
- **Workflow** : ajouter/renommer/réordonner/supprimer des colonnes par projet.
- **Labels** : nom + couleur.
- **Thème** : clair / sombre + couleur d'accent.

### 3.6 Commentaires & pièces jointes
- Fil de commentaires par ticket.
- Pièces jointes multiples ; aperçu inline des images ; téléchargement des logs/fichiers.

### 3.7 Authentification & rôles
- Connexion par e-mail/mot de passe (OAuth optionnel en évolution).
- Rôle porté par l'utilisateur (`ADMIN` / `REPORTER`).
- Détail : [`.ai/specs/0004-roles-et-permissions.md`](./.ai/specs/0004-roles-et-permissions.md)

## 4. Modèle de données (résumé)

Entités : **User, Project, Column, Ticket, Sprint, Label, LabelOnTicket, Attachment, Comment**.
Schéma complet et relations : [`.ai/architecture.md`](./.ai/architecture.md#modèle-de-données-canonique).

## 5. Parcours utilisateur clés

1. **Onboarding admin** : créer un projet → configurer les colonnes → inviter des utilisateurs.
2. **Signalement (rapporteur)** : ouvrir « Nouveau ticket » → titre → coller une capture → créer.
3. **Traitement** : l'admin trie le backlog, planifie un sprint, déplace les cartes en Kanban.
4. **Suivi** : filtrer la vue liste par sprint/assigné ; commenter ; clôturer.

## 6. Exigences non-fonctionnelles

- **Performance** : interactions courantes < 200 ms perçues ; listes paginées.
- **Accessibilité** : navigation clavier complète, rôles ARIA (Radix), contrastes AA.
- **Sécurité** : autorisation serveur systématique, validation Zod, pas de secret en dur,
  URLs presignées à durée limitée pour les fichiers.
- **RGPD** : minimisation des données personnelles ; utilisateurs internes.
- **Portabilité** : self-hostable (Docker + PostgreSQL), déployé via **Dokploy** sur `apps.rakoon.io` (voir [`DEPLOY.md`](./DEPLOY.md)).
- **Responsive** : utilisable sur tablette/desktop (pas d'app native).

## 7. Périmètre

### ✅ Dans la v1
Création rapide de ticket (paste), Kanban configurable, vue liste, sprints/lots, commentaires,
pièces jointes, personnalisation (workflow/labels/thème), rôles Admin/Rapporteur.

### 🔜 Backlog (post-v1, hors périmètre actuel)
Temps réel, notifications e-mail, app mobile native, intégrations (Jira/GitHub/Slack), reporting
(burndown/vélocité), multi-tenant, i18n, champs personnalisés, rôles additionnels.
Rappel des **non-objectifs** : [`.ai/vision.md`](./.ai/vision.md#-non-objectifs-v1).

## 8. Definition of Done (v1)

- [ ] Un admin crée un projet et configure ses colonnes.
- [ ] Un rapporteur crée un ticket avec une image collée en < 30 s.
- [ ] Les cartes se déplacent en Kanban (souris **et** clavier), l'ordre persiste.
- [ ] Un sprint regroupe des tickets ; la vue liste filtre par sprint/assigné/label.
- [ ] Les permissions Admin/Rapporteur sont imposées côté serveur.
- [ ] `typecheck` + `lint` + `test` passent.

## 9. Glossaire

- **Ticket** : unité de travail (bug, feature, tâche, chore).
- **Colonne** : statut configurable du workflow (une colonne du Kanban).
- **Lot** : regroupement de tickets.
- **Sprint** : lot **daté** avec objectif (itération agile).
- **Backlog** : tickets non planifiés dans un sprint.
- **Rank** : ordre lexicographique d'une carte dans sa colonne.
