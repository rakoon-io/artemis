# SPEC - Artemis

> Cible produit détaillée. Ce document décrit **quoi** construire ; le **comment**
> technique se lit dans le code (`src/`) et le schéma de données ([`prisma/schema.prisma`](./prisma/schema.prisma)).

---

## 1. Résumé

Artemis est un **outil interne de suivi de tickets** sobre, moderne, efficace et
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
| Créer un ticket | | |
| Voir les tickets de ses projets | | |
| Commenter un ticket | | |
| Éditer **ses** tickets | | |
| Éditer **tout** ticket / réassigner / changer le statut d'autrui | | |
| Déplacer une carte en Kanban | | ses tickets uniquement |
| Gérer les colonnes / workflow | | |
| Créer / gérer les sprints & lots | | |
| Gérer les labels | | |
| Gérer les utilisateurs & rôles | | |
| Supprimer un ticket / projet | | |
| Paramètres & personnalisation du projet | | |

> Règle d'or : **l'UI masque, le serveur impose.** Toute action passe par une policy RBAC serveur.

## 3. Fonctionnalités (v1)

### 3.1 Création rapide de ticket (fonction phare)
- Formulaire minimal : **titre obligatoire** ; le reste (description, type, priorité, assigné,
  labels, sprint) est **optionnel** et pré-rempli par des valeurs par défaut.
- **Pièce jointe par copier-coller** : coller une **image** du presse-papier, un **fichier de log**
  ou du **texte** directement dans le formulaire (zone de collage dédiée).
- Le ticket reçoit une **clé** lisible (`RKN-123`) et arrive dans la première colonne du workflow.
- Critère : un rapporteur crée un ticket **avec image collée en < 30 s**.

### 3.2 Vue Kanban
- Colonnes = statuts **configurables** par projet ; cartes = tickets.
- **Drag & drop** (souris + **clavier**, via dnd-kit) pour déplacer/réordonner ; persistance de
  l'ordre via `rank` (lexorank).
- Filtres rapides (assigné, label, type, priorité, sprint) et limite d'en-cours (WIP) optionnelle.

### 3.3 Vue liste
- Table dense : clé, titre, type, priorité, statut, assigné, sprint, labels, dates.
- **Filtres**, **tri** multi-colonnes et **recherche** plein texte (titre/description).

### 3.4 Sprints / lots
- Créer un **lot** (regroupement) ou un **sprint** (lot **daté** : `startDate`/`endDate`, objectif).
- Backlog → planification (glisser des tickets dans un sprint) → sprint actif → clôturé.

### 3.5 Modules & composants applicatifs

Deux niveaux **facultatifs** décrivent *de quelle partie du produit* parle une demande : le
**module** (grosse maille, un domaine fonctionnel) et le **composant** (maille fine, une brique).

#### Modules fonctionnels
- Un **module** est un **domaine fonctionnel** du produit (ex. « Gestion des utilisateurs »,
  « Suivi des tickets ») : nom, description libre (périmètre) et couleur. Il **regroupe plusieurs
  composants** (pages, briques réutilisables, services).
- **Un module n'est pas un epic.** C'est de la **structure produit**, pas un conteneur de travail :
  il ne se planifie pas, n'a ni dates ni avancement et **ne se « termine » jamais**, contrairement
  à un sprint ou un lot (§3.4). « Suivi des tickets » existera toujours ; un sprint, non.
- Un composant appartient **au plus à un module** (`Component.moduleId`, optionnel). Les composants
  **transverses** - typiquement les `SHARED`, servis par plusieurs modules - n'en ont aucun.
- Comme le catalogue de composants, les modules sont **inhérents au projet** : aucun module par
  défaut n'est créé à la création d'un projet. Tant qu'il n'y en a aucun, l'interface se comporte
  comme si la notion n'existait pas (ni champ, ni filtre).
- Nom + description sont **injectés dans le contexte projet transmis à l'IA**, au même titre que
  les composants, et exposés via le serveur MCP.

#### Composants applicatifs
- Chaque projet déclare le **catalogue des composants** dont son application est faite : nom,
  **nature**, description libre (rôle / périmètre) et couleur.
- Trois natures (`ComponentKind`) : **Page** (`PAGE`, un écran / une route), **Composant
  réutilisable** (`SHARED` : design system, widget partagé), **Service** (`SERVICE`,
  un service technique : API, job, intégration). Ces trois libellés sont ceux affichés par
  l'interface (`taxonomy.componentKinds`) : la documentation les reprend à l'identique.
- Un ticket référence **au plus un composant** (`Ticket.componentId`, optionnel) : il
  **contextualise la demande** en indiquant *de quelle partie du produit* elle parle. Affiché sur
  la carte Kanban, dans la vue liste et sur le détail du ticket ; **filtrable** dans les deux vues.
- Le catalogue (nom + nature + description) est **injecté dans le contexte envoyé à l'IA** lors de
  la génération d'un ticket à partir d'un texte libre, et exposé via le serveur MCP.
- Le catalogue est **inhérent au projet** : aucun composant par défaut n'est créé à la création
  d'un projet (contrairement aux types et priorités). Tant qu'il est vide, l'interface se comporte
  comme si la notion n'existait pas (ni champ, ni filtre).

#### Module effectif d'un ticket (invariant)
- Le module **effectif** d'un ticket est **celui de son composant** dès qu'il en a un.
- `Ticket.moduleId` (optionnel) ne porte donc le module que d'un ticket **sans composant** : une
  demande à grosse maille, qu'aucune brique précise ne résume.
- Corollaire imposé **côté serveur** : choisir un composant **remet `Ticket.moduleId` à `null`**.
  Une seule source de vérité, donc le module d'un ticket ne peut **jamais** contredire celui de
  son composant.
- **Tout est facultatif** : un projet peut ne déclarer aucun module, un composant peut n'être
  rattaché à aucun, et un ticket peut n'avoir ni composant ni module (demande transverse).

### 3.6 Personnalisation
- **Workflow** : ajouter/renommer/réordonner/supprimer des colonnes par projet.
- **Labels** : nom + couleur.
- **Modules & composants** : structure applicative, configurée **par projet** (cf. §3.5).
- **Thème** : clair / sombre + couleur d'accent.

### 3.7 Commentaires & pièces jointes
- Fil de commentaires par ticket.
- Pièces jointes multiples ; aperçu inline des images ; téléchargement des logs/fichiers.

### 3.8 Authentification & rôles
- Connexion par e-mail/mot de passe (OAuth optionnel en évolution).
- Rôle porté par l'utilisateur (`ADMIN` / `REPORTER`).

## 4. Modèle de données (résumé)

Entités : **User, Project, Column, Module, Component, Ticket, Sprint, Label, LabelOnTicket, Attachment, Comment**.
Schéma complet et relations : [`prisma/schema.prisma`](./prisma/schema.prisma).

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

### Dans la v1
Création rapide de ticket (paste), Kanban configurable, vue liste, sprints/lots, commentaires,
pièces jointes, personnalisation (workflow/labels/thème), rôles Admin/Rapporteur.

### Backlog (post-v1, hors périmètre actuel)
Temps réel, notifications e-mail, app mobile native, intégrations (Jira/GitHub/Slack), reporting
(burndown/vélocité), multi-tenant, i18n, champs personnalisés, rôles additionnels.

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
- **Module** : domaine fonctionnel du produit (ex. « Suivi des tickets »), regroupant plusieurs
  composants. C'est de la **structure produit**, pas un lot de travail : **ce n'est pas un epic**,
  il ne se planifie pas et ne se termine jamais. Facultatif à tous les niveaux ; le module
  **effectif** d'un ticket est celui de son composant, et un ticket ne porte le sien que s'il n'a
  aucun composant (cf. §3.5).
- **Composant** : partie de l'application décrite par le projet (catalogue propre à chaque projet),
  rattachée **au plus à un module** - aucun pour les composants transverses.
  Sa **nature** est une **page** (`PAGE`, un écran / une route), un **composant réutilisable**
  (`SHARED` : design system, widget partagé) ou un **service** (`SERVICE`, technique : API,
  job, intégration). Un ticket peut en référencer un pour situer la demande.
- **Lot** : regroupement de tickets.
- **Sprint** : lot **daté** avec objectif (itération agile).
- **Backlog** : tickets non planifiés dans un sprint.
- **Rank** : ordre lexicographique d'une carte dans sa colonne.
