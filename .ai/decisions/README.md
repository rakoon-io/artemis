# 🗂️ Décisions d'architecture (ADR)

Ce dossier trace les **décisions d'architecture** structurantes de Rakoon Tracker sous forme
d'**ADR** (*Architecture Decision Records*).

Un **ADR** est une note courte et datée qui capture **une** décision technique importante : son
**contexte** (le problème et les contraintes), la **décision** retenue, les **alternatives** écartées
et les **conséquences** (bénéfices et compromis). Une fois **Acceptée**, une décision ne se réécrit
pas : si la direction change, on ajoute un **nouvel** ADR qui la remplace (statut « Remplacée » /
« Dépréciée »). Les ADR complètent la [vision](../vision.md) (North Star), l'
[architecture](../architecture.md) (modèle de données & patterns) et la
[spec produit](../../SPEC.md).

## 📋 Index des ADR

| Numéro | Titre | Statut | Lien |
|--------|-------|--------|------|
| ADR-0001 | Stack : monolithe Next.js + TypeScript | Acceptée | [0001](./0001-stack-nextjs-typescript.md) |
| ADR-0002 | Workflow Kanban personnalisable (colonnes en base) | Acceptée | [0002](./0002-workflow-kanban-personnalisable.md) |
| ADR-0003 | RBAC à deux rôles (Admin / Rapporteur), extensible | Acceptée | [0003](./0003-rbac-admin-rapporteur.md) |
| ADR-0004 | Pièces jointes « paste-first » (presse-papier → S3) | Acceptée | [0004](./0004-pieces-jointes-paste-first.md) |
| ADR-0005 | Déploiement Dokploy (Docker) sur OVH / `apps.rakoon.io` | Acceptée | [0005](./0005-deploiement-dokploy-ovh.md) |
| ADR-0006 | Types & priorités de tickets configurables par projet (tables) | Acceptée | [0006](./0006-types-priorites-configurables.md) |

## 🧭 Conventions

- **Nommage** : `000X-titre-en-kebab-case.md`, numérotation continue.
- **Statuts** : `Proposée` → `Acceptée` → (`Remplacée` | `Dépréciée`).
- **Immuabilité** : on ne réécrit pas une décision acceptée ; on en ouvre une nouvelle.
- Toute **décision structurante** ⇒ un ADR (rappel dans [`CLAUDE.md`](../../CLAUDE.md)).

## 📝 Modèle vierge (à copier)

```markdown
# ADR-000X — <Titre>
- **Statut** : Acceptée
- **Date** : AAAA-MM-JJ
- **Décideurs** : équipe Rakoon Tracker

## Contexte
<Problème à résoudre, contraintes et forces en présence.>

## Décision
<La décision retenue, formulée clairement et au présent.>

## Alternatives considérées
<Options écartées et raisons de leur rejet.>

## Conséquences
### Positives
<Bénéfices attendus.>

### Négatives / compromis
<Coûts, risques et dette assumés.>

## Références
<Liens utiles : ../architecture.md · ../vision.md · ../../SPEC.md · ../specs/000Y-....md · ./000Y-....md>
```
