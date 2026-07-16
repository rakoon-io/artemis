# Spécifications fonctionnelles

> Spécifications **fonctionnelles** de Rakoon Tracker (v1). Chaque spec **détaille** une
> fonctionnalité déjà résumée dans [`../../SPEC.md`](../../SPEC.md). La direction produit est fixée
> par la [vision](../vision.md) (North Star) ; le **modèle de données** de référence vit dans
> [l'architecture](../architecture.md). **En cas de conflit, la vision prime.**

Ces documents décrivent **quoi** construire et **comment le vérifier** (critères d'acceptation
testables). Le **comment** technique reste dans l'architecture et les ADR (`../decisions/`).

## Index des specs

| Numéro | Titre | Rôles | Lien |
|--------|-------|-------|------|
| SPEC-0001 | Création rapide de ticket | Admin · Rapporteur | [0001](./0001-creation-ticket-rapide.md) |
| SPEC-0002 | Vue Kanban | Admin · Rapporteur | [0002](./0002-vue-kanban.md) |
| SPEC-0003 | Sprints & lots | Admin | [0003](./0003-sprints-et-lots.md) |
| SPEC-0004 | Rôles & permissions | Admin · Rapporteur | [0004](./0004-roles-et-permissions.md) |
| SPEC-0005 | Vue liste | Admin · Rapporteur | [0005](./0005-vue-liste.md) |

## Convention

- **Numérotation** : `000X-slug-en-kebab-case.md`.
- **Statut** : `Rédigée (v1)` → `Validée` → `Implémentée`.
- **Terminologie** : Ticket, Projet, Colonne (statut configurable), Sprint / Lot, Pièce jointe,
  Commentaire, Label, Tableau Kanban, Backlog, `rank` (lexorank), clé de ticket (`RKN-123`).
- **Rôles** : Admin (`ADMIN`) / Rapporteur (`REPORTER`).

## Modèle de spec (à copier)

```markdown
# SPEC-000X - <Titre>
- **Statut** : Rédigée (v1)
- **Rôles concernés** : <Admin · Rapporteur>

## Objectif
<Le problème résolu et le résultat attendu, en 2–3 phrases.>

## User stories
- En tant que <rôle>, je veux <action> afin de <bénéfice>.
- En tant que <rôle>, je veux <action> afin de <bénéfice>.

## Critères d'acceptation
- [ ] Étant donné <contexte>, Quand <action>, Alors <résultat vérifiable>.
- [ ] <Critère mesurable et testable>.

## Règles & comportements
- <Règles métier, valeurs par défaut, permissions, validation Zod…>

## Cas limites
- <Erreurs, états vides, concurrence, limites, perte de connexion…>

## Hors périmètre (v1)
- <Ce qui est explicitement exclu ; rappel des non-objectifs.>

## Références
- Spec produit : [`../../SPEC.md`](../../SPEC.md)
- Architecture : [`../architecture.md`](../architecture.md)
- Vision : [`../vision.md`](../vision.md)
- ADR : [`../decisions/000Y-....md`](../decisions/)
- Specs liées : [`./000Y-....md`](./)
```
