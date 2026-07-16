# SPEC-0005 - Vue liste
- **Statut** : Rédigée (v1)
- **Rôles concernés** : Admin · Rapporteur

## Objectif

Fournir une **table dense** des tickets d'un projet, complémentaire du Kanban, pour retrouver et
trier rapidement l'information. Colonnes affichées : **clé, titre, type, priorité, statut, assigné,
sprint, labels, dates** (`createdAt` / `updatedAt`). La vue offre **filtres**, **tri multi-colonnes**,
**recherche plein texte** (titre / description) et **pagination**.

## User stories

- En tant qu'**Admin**, je veux filtrer les tickets par assigné, label, type, priorité, statut ou
  sprint afin d'isoler un sous-ensemble.
- En tant qu'utilisateur, je veux **rechercher** un mot dans le titre ou la description afin de
  retrouver un ticket sans le parcourir.
- En tant qu'**Admin**, je veux **trier** par plusieurs colonnes (ex. priorité puis date) afin de
  prioriser le travail.
- En tant que **Rapporteur**, je veux retrouver **mes** tickets afin de suivre leur avancement.

## Critères d'acceptation

- [ ] La table affiche les colonnes : **clé, titre, type, priorité, statut, assigné, sprint, labels,
      créé le, mis à jour le**.
- [ ] Étant donné une recherche, Quand je saisis un terme, Alors seuls les tickets dont le **titre**
      ou la **description** contient ce terme (insensible à la casse) sont listés.
- [ ] Étant donné un tri sur une colonne, Quand j'ajoute un second critère, Alors le tri est
      **multi-colonnes** et le sens (asc/desc) de chaque critère est visible.
- [ ] Étant donné plusieurs filtres, Quand je les combine, Alors ils s'appliquent en **ET logique**
      et un compteur indique le nombre de résultats.
- [ ] Étant donné un grand volume, Quand je navigue, Alors les résultats sont **paginés** et l'état
      (filtres / tri / page) est reflété dans l'URL (partageable).

## Règles & comportements

- **Recherche plein texte** limitée au **titre** et à la **description** (v1).
- **Filtres** : assigné, label, type (`BUG/FEATURE/TASK/CHORE`), priorité (`LOW…URGENT`), statut
  (colonne), sprint ; combinables.
- **Tri multi-colonnes** avec priorité des critères ; tri par défaut : `updatedAt` décroissant.
- **Pagination** côté serveur (offset/limite ou curseur) pour tenir les grands volumes.
- **Périmètre de visibilité** : un utilisateur ne voit que les tickets de **ses projets** (imposé serveur).
- **Cohérence Kanban/liste** : les mêmes filtres (assigné, label, type, priorité, sprint) existent
  dans les deux vues.

## Cas limites

- **Résultat vide** : message explicite + action « réinitialiser les filtres ».
- **Grand volume** : la pagination borne le coût ; aucune récupération de la totalité en mémoire.
- **Filtres combinés sans résultat** : distingué d'une erreur ; les filtres restent modifiables.
- **Terme très court / caractères spéciaux** : requête assainie, pas d'échec serveur.
- **Ticket modifié pendant la navigation** : reflété au rechargement (pas de temps réel en v1).

## Hors périmètre (v1)

- Recherche dans les **commentaires** et les pièces jointes.
- Vues sauvegardées / colonnes personnalisables par utilisateur.
- Export CSV / Excel.
- Édition **inline** en masse depuis la table.

## Références

- Spec produit : [`../../SPEC.md`](../../SPEC.md) (§ 3.3)
- Architecture (modèle `Ticket`) : [`../architecture.md`](../architecture.md#modèle-de-données-canonique)
- Vue Kanban (filtres partagés) : [`./0002-vue-kanban.md`](./0002-vue-kanban.md)
- Sprints & lots (filtre sprint) : [`./0003-sprints-et-lots.md`](./0003-sprints-et-lots.md)
- Rôles & permissions (visibilité) : [`./0004-roles-et-permissions.md`](./0004-roles-et-permissions.md)
