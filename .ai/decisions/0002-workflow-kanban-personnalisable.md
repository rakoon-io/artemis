# ADR-0002 - Workflow Kanban personnalisable (colonnes en base)
- **Statut** : Acceptée
- **Date** : 2026-07-09
- **Décideurs** : équipe Artemis

## Contexte
La **personnalisation du flux de travail** est une exigence produit non négociable : chaque équipe
doit adapter ses statuts - les **Colonnes** du Tableau Kanban - à sa méthode agile. Un jeu de statuts
figé conviendrait à une équipe mais pas aux suivantes, et interdirait l'ajout, le renommage, le
réordonnancement et la suppression de colonnes attendus en v1. Il faut aussi **réordonner librement**
les cartes dans une colonne sans renuméroter tout son contenu.

## Décision
Les statuts sont modélisés comme des lignes **`Column`** en base, rattachées à un **Projet**
(`projectId`). Chaque colonne porte un `name`, un `order` (position dans le tableau) et un `wipLimit`
optionnel (limite d'en-cours). Un **Ticket** référence sa colonne via `columnId` : **aucun enum de
statut codé en dur**.

L'ordre d'une carte dans sa colonne est porté par un champ `rank` lexicographique (**lexorank**) :
déplacer une carte ne recalcule qu'**un** `rank` (valeur intercalée entre ses voisines), sans toucher
aux autres tickets. L'**Admin** gère les colonnes (ajouter / renommer / réordonner / supprimer) ; le
**Rapporteur** déplace ses propres tickets.

## Alternatives considérées
- **Statuts codés en dur (enum)** - simple et « sémantiquement » garanti (ex. `TODO/DOING/DONE`),
  mais **incompatible** avec l'exigence de personnalisation ; toute évolution imposerait une migration
  de schéma.
- **Workflow global unique pour toute l'organisation** - un seul jeu de colonnes partagé par tous les
  projets ; plus simple, mais **empêche** chaque projet d'avoir son propre flux, ce que le produit
  promet.

## Conséquences
### Positives
- **Flexibilité totale** : chaque projet définit son flux, éditable sans déploiement.
- Réordonnancement quasi **O(1)** des cartes grâce au `rank` lexorank.
- Le **WIP** par colonne devient une donnée, pas une constante.

### Négatives / compromis
- **Complexité accrue** : seed des colonnes par défaut, validation (unicité de l'`order`) et
  réaffectation des tickets à la première colonne lors de la suppression d'une colonne.
- **Pas de statut « sémantique » garanti** : le code ne peut pas supposer qu'une colonne « Terminé »
  existe ; les règles dépendant d'un état final doivent s'appuyer sur une convention explicite.
- **Rééquilibrage** occasionnel des `rank` à prévoir en cas de collisions.

## Références
- Modèle de données (`Column`, `Ticket.rank`) & pattern « Workflow personnalisable » : [`../architecture.md`](../architecture.md)
- Vision (principe « Personnalisable ») : [`../vision.md`](../vision.md)
- Spécification produit (Vue Kanban, Personnalisation) : [`../../SPEC.md`](../../SPEC.md)
- Spec fonctionnelle : [`../specs/0002-vue-kanban.md`](../specs/0002-vue-kanban.md)
- ADR socle : [`./0001-stack-nextjs-typescript.md`](./0001-stack-nextjs-typescript.md)
