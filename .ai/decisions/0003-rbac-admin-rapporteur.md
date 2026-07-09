# ADR-0003 — RBAC à deux rôles (Admin / Rapporteur), extensible
- **Statut** : Acceptée
- **Date** : 2026-07-09
- **Décideurs** : équipe Rakoon Tracker

## Contexte
En v1, Rakoon Tracker distingue deux profils : **Admin** (vue étendue — projets, colonnes,
sprints/lots, labels, utilisateurs, paramètres, accès total aux tickets) et **Rapporteur** (vue
limitée — créer des tickets avec pièces jointes, consulter et commenter ses projets, éditer ses
propres tickets). Le modèle doit rester **simple** à porter en v1 tout en autorisant l'ajout futur de
rôles **sans refonte**. Règle d'or : **l'UI masque, le serveur impose.**

## Décision
Le rôle est un champ `role` sur **`User`** (enum `Role { ADMIN REPORTER }`, défaut `REPORTER`). Les
décisions d'autorisation sont **centralisées** dans des **policies** (`server/policies`) exposant une
fonction `peut(user, action, ressource)`. Aucune vérification de droit n'est dispersée dans l'UI :
les composants **masquent** les actions interdites pour le confort, mais toute mutation (Server
Action / Route Handler) **rappelle la policy côté serveur** avant d'agir. Le jeu d'actions (créer un
ticket, gérer les colonnes, gérer les sprints, administrer les utilisateurs…) est explicite et
**testé unitairement**, ce qui rend l'ajout d'un rôle additif.

## Alternatives considérées
- **ACL par ressource (permissions fines par entité)** — puissant, mais disproportionné pour deux
  rôles ; coût de modélisation, de stockage et de tests injustifié en v1.
- **Multiplier les rôles dès la v1** (lecteur, développeur, manager…) — complexité prématurée sans
  besoin produit avéré ; l'extensibilité des policies permet de les ajouter plus tard.

## Conséquences
### Positives
- **Simplicité** : un champ, un module de policies, une matrice de permissions claire.
- **Sécurité** : autorisation systématiquement imposée côté serveur, testable de façon isolée.
- **Extensible** : ajouter un rôle = étendre l'enum et les policies, sans refonte.

### Négatives / compromis
- **Granularité limitée** à deux rôles : pas de permission par projet ni par ressource pour l'instant.
- Certaines règles fines (ex. « éditer **ses** tickets », « déplacer ses cartes ») reposent sur la
  logique de policy et doivent être **couvertes par des tests**.
- Une **double implémentation** (masquage UI + imposition serveur) à garder cohérente.

## Références
- Pattern RBAC (`server/policies`, `peut(user, action, ressource)`) : [`../architecture.md`](../architecture.md)
- Vision (rôles Admin / Rapporteur, RBAC extensible) : [`../vision.md`](../vision.md)
- Spécification produit (matrice de permissions) : [`../../SPEC.md`](../../SPEC.md)
- Spec fonctionnelle : [`../specs/0004-roles-et-permissions.md`](../specs/0004-roles-et-permissions.md)
- ADR socle : [`./0001-stack-nextjs-typescript.md`](./0001-stack-nextjs-typescript.md)
