# SPEC-0003 - Sprints & lots
- **Statut** : Rédigée (v1)
- **Rôles concernés** : Admin

## Objectif

Permettre à l'**Admin** de regrouper des tickets pour la planification agile via deux notions
portées par la même entité `Sprint` :
- un **lot** : simple **regroupement** de tickets (sans dates) ;
- un **sprint** : un lot **daté** (`startDate`/`endDate`) doté d'un **objectif** (`goal`).

Le cycle de vie suit les états `PLANNED` → `ACTIVE` → `COMPLETED`, du backlog à la clôture.

## User stories

- En tant qu'**Admin**, je veux créer un **lot** pour regrouper des tickets liés afin de les traiter
  ensemble sans imposer d'échéance.
- En tant qu'**Admin**, je veux créer un **sprint** daté avec un objectif afin de cadrer une itération.
- En tant qu'**Admin**, je veux **glisser des tickets** du backlog vers un sprint afin de le planifier.
- En tant qu'**Admin**, je veux **démarrer** puis **clôturer** un sprint afin de suivre l'avancement.

## Critères d'acceptation

- [ ] Étant donné un projet, Quand je crée un lot sans dates, Alors il est enregistré avec
      `state = PLANNED`, `startDate = null`, `endDate = null`.
- [ ] Étant donné un sprint, Quand je renseigne `startDate` et `endDate`, Alors `endDate` doit être
      **postérieure** à `startDate` (sinon erreur de validation).
- [ ] Étant donné le **backlog** (tickets sans `sprintId`), Quand je glisse un ticket vers un sprint,
      Alors son `sprintId` est mis à jour et il quitte le backlog.
- [ ] Étant donné un sprint `PLANNED`, Quand je le démarre, Alors il passe `ACTIVE`.
- [ ] Étant donné un sprint `ACTIVE`, Quand je le clôture, Alors il passe `COMPLETED`.
- [ ] Étant donné un **Rapporteur**, Quand il tente de créer ou gérer un sprint, Alors l'action est
      refusée côté serveur (**403**).

## Règles & comportements

- **Réservé à l'Admin** : création, édition, changement d'état et affectation de tickets passent par
  une **policy serveur**.
- **Lot vs sprint** : un lot est un sprint **sans dates** ; renseigner dates + objectif le qualifie
  de sprint. Même entité `Sprint`, même table.
- **Backlog** = tickets dont `sprintId` est `null`. La planification déplace des tickets **entre**
  backlog et sprint (mise à jour de `sprintId`).
- **Clôture** : les tickets **non terminés** peuvent être renvoyés au backlog ou déplacés vers un
  autre sprint (choix explicite de l'Admin).
- **Un seul sprint `ACTIVE`** recommandé par projet (bonne pratique, non bloquant en v1).

## Cas limites

- **Sprint sans date** : traité comme un **lot** ; aucun calcul d'échéance.
- **Une seule date renseignée** : refusé - cohérence exigée (les deux dates ou aucune).
- **Tickets non terminés à la clôture** : l'Admin choisit leur destination (backlog / sprint
  suivant) ; aucun ticket n'est perdu.
- **Chevauchement de sprints** : autorisé mais **signalé** (avertissement) ; pas de blocage en v1.
- **Suppression d'un sprint** : les tickets associés retournent au backlog (`sprintId = null`).

## Hors périmètre (v1)

- Reporting d'itération : **burndown**, **vélocité**, capacité.
- Sprints récurrents / cadence automatique.
- Notifications de début / fin de sprint.

## Références

- Spec produit : [`../../SPEC.md`](../../SPEC.md) (§ 3.4)
- Architecture (`Sprint`, `SprintState`) : [`../architecture.md`](../architecture.md#modèle-de-données-canonique)
- Vision (planification agile) : [`../vision.md`](../vision.md)
- Vue Kanban : [`./0002-vue-kanban.md`](./0002-vue-kanban.md)
- Vue liste (filtre par sprint) : [`./0005-vue-liste.md`](./0005-vue-liste.md)
- Rôles & permissions : [`./0004-roles-et-permissions.md`](./0004-roles-et-permissions.md)
