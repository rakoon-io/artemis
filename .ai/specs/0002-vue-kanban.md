# SPEC-0002 — Vue Kanban
- **Statut** : Rédigée (v1)
- **Rôles concernés** : Admin · Rapporteur

## Objectif

Offrir un **Tableau Kanban** par projet : les **colonnes** sont les statuts configurables, les
**cartes** sont les tickets. Le déplacement se fait par **drag & drop souris et clavier** (dnd-kit),
l'ordre étant persisté via le `rank` (lexorank). Des **filtres rapides** et une **limite WIP**
optionnelle aident à réguler le flux de travail.

## User stories

- En tant qu'**Admin**, je veux déplacer n'importe quelle carte d'une colonne à l'autre afin de faire
  avancer le travail dans le workflow.
- En tant que **Rapporteur**, je veux déplacer **mes** tickets afin de mettre à jour leur statut.
- En tant qu'utilisateur clavier, je veux saisir et déplacer une carte **sans souris** afin de
  garantir l'accessibilité.
- En tant qu'**Admin**, je veux **filtrer** le tableau (assigné, label, type, priorité, sprint) afin
  de me concentrer sur un sous-ensemble.
- En tant qu'**Admin**, je veux définir une **limite WIP** par colonne afin de repérer les goulots.

## Critères d'acceptation

- [ ] Le tableau affiche les colonnes triées par `order`, chacune listant ses tickets triés par `rank`.
- [ ] Étant donné une carte, Quand je la dépose dans une autre colonne, Alors son `columnId` et son
      `rank` sont mis à jour et persistés (un rechargement conserve la position).
- [ ] Étant donné le focus clavier sur une carte, Quand j'active le déplacement (Espace) et utilise
      les flèches, Alors la carte se déplace puis se dépose (Espace) ou s'annule (Échap).
- [ ] Étant donné un **Rapporteur**, Quand il tente de déplacer un ticket dont il n'est ni reporter
      ni assigné, Alors l'action est refusée côté serveur (**403**) et l'UI ne propose pas le drag.
- [ ] Étant donné un filtre actif, Quand je l'applique, Alors seules les cartes correspondantes
      restent visibles et les compteurs de colonne se recalculent.
- [ ] Étant donné une colonne avec `wipLimit`, Quand le nombre de cartes atteint la limite, Alors un
      indicateur visuel le signale ; le dépassement est **averti** (non bloquant en v1).

## Règles & comportements

- **Réordonnancement** : le `rank` lexicographique permet d'insérer une carte entre deux voisines
  sans renuméroter la colonne (lexorank).
- **Permissions** : l'Admin déplace tout ticket ; le Rapporteur uniquement les siens (reporter ou
  assigné). Contrôle **imposé par une policy serveur** ; l'UI ne fait que masquer/désactiver.
- **Optimistic UI** : le déplacement s'affiche immédiatement (TanStack Query) puis se confirme ou se
  **rollback** si le serveur refuse.
- **Rafraîchissement à la demande** : pas de temps réel ; la vue se synchronise au (re)chargement.
- **Accessibilité** : annonces ARIA (colonne, position) pendant le déplacement clavier.

## Cas limites

- **Colonne vide** : zone de dépôt visible et fonctionnelle même sans carte.
- **Dépassement WIP** : signalé visuellement ; le déplacement reste autorisé (avertissement) en v1.
- **Déplacement concurrent** : deux utilisateurs déplacent la même carte → conflit de `rank` résolu
  par recalcul, sans perte de carte.
- **Colonne supprimée** en cours de session : les tickets orphelins sont réaffectés à la première
  colonne ; l'UI se resynchronise et signale le changement.

## Hors périmètre (v1)

- Swimlanes (regroupement horizontal par assigné/épic).
- Règles d'automatisation (transitions conditionnelles).
- Blocage **dur** du dépassement WIP.
- Mise à jour temps réel multi-utilisateurs.

## Références

- Spec produit : [`../../SPEC.md`](../../SPEC.md) (§ 3.2)
- Architecture (`rank`, colonnes, patterns) : [`../architecture.md`](../architecture.md#patterns-clés)
- ADR workflow personnalisable : [`../decisions/0002-workflow-kanban-personnalisable.md`](../decisions/0002-workflow-kanban-personnalisable.md)
- Rôles & permissions : [`./0004-roles-et-permissions.md`](./0004-roles-et-permissions.md)
- Sprints & lots : [`./0003-sprints-et-lots.md`](./0003-sprints-et-lots.md)
