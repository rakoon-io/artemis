# ADR-0006 - Types & priorités de tickets configurables par projet (tables plutôt qu'enums)
- **Statut** : Acceptée
- **Date** : 2026-07-13
- **Décideurs** : équipe Artemis

## Contexte
La **personnalisation** est une exigence produit (cf. [ADR-0002](./0002-workflow-kanban-personnalisable.md)
pour les colonnes du workflow). Or, en v1, le **type** de ticket (`BUG`, `FEATURE`, `TASK`, `CHORE`)
et la **priorité** (`LOW`…`URGENT`) étaient des **enums figés**, donc **non personnalisables** : une
équipe ne pouvait ni ajouter ses propres types (ex. « Incident », « Épopée »), ni renommer, ni choisir
les couleurs. Le besoin exprimé est de rendre **toute** la taxonomie configurable via l'interface admin.

## Décision
Les types et priorités deviennent des **données par projet**, plus des enums :
- Modèles **`TicketType`** et **`TicketPriority`** (`{ id, projectId, name, color, order }`,
  `@@unique([projectId, name])`). `Ticket` les référence par **FK** (`typeId` / `priorityId`).
- **`Project.accentColor`** (hex, nullable) : couleur d'accent personnalisable par projet (surcharge
  la variable CSS `--primary`).
- **Jeux par défaut** créés à la création d'un projet et par le seed (4 types, 4 priorités).
- **Gestion via Paramètres → onglets « Types » / « Priorités »** (Admin) : ajouter, renommer,
  recolorer, réordonner, supprimer. **Suppression bloquée** si des tickets utilisent l'entrée.
- Le rendu (badges board / liste / filtres / dialogs) s'appuie sur `name` + `color` configurés.

## Alternatives considérées
- **Conserver les enums** - simple, mais **incompatible** avec l'exigence de personnalisation.
- **Overlay de configuration** (garder les 4 enums, table de surcharge nom/couleur) - permettrait de
  renommer/recolorer sans migration, mais **interdit l'ajout/suppression** de types → écarté.

## Conséquences
### Positives
- **Personnalisation totale** de la taxonomie par projet (comme les colonnes et labels).
- Couleur portée par la donnée (cohérence board / liste / filtres).
- Cohérent avec le modèle « tout configurable par projet ».

### Négatives / compromis
- **Migration** enum → table + FK (réalisée ; migration Prisma régénérée, pas de données prod).
- Le code ne peut plus **présumer** un ensemble fixe de types/priorités ; défaut = 1er par `order`.
- Nécessite une **garde de suppression** (refus si en usage) et le seed des jeux par défaut.

## Références
- Modèle de données (`TicketType`, `TicketPriority`, `Project.accentColor`) : [`../architecture.md`](../architecture.md#modèle-de-données-canonique)
- Personnalisation du workflow (colonnes) : [`./0002-workflow-kanban-personnalisable.md`](./0002-workflow-kanban-personnalisable.md)
- Spécification produit (personnalisation) : [`../../SPEC.md`](../../SPEC.md)
