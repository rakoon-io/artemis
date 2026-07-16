# ADR-0001 - Stack : monolithe Next.js + TypeScript
- **Statut** : Acceptée
- **Date** : 2026-07-09
- **Décideurs** : équipe Artemis

## Contexte
Artemis est un outil interne de suivi de tickets voulu sobre, moderne, efficace et
personnalisable, livré par une équipe **unique et réduite**. Trois exigences pèsent sur le choix
technique : une **type-safety de bout en bout** (du formulaire jusqu'à la base), une **DX élevée**
pour itérer vite, et la possibilité de **self-hoster** (Docker + PostgreSQL) autant que de déployer
sur une plateforme managée. Le produit reste un monolithe fonctionnel : pas de microservices, pas de
temps réel en v1, et le besoin d'un écosystème UI mature pour obtenir un rendu épuré rapidement.

## Décision
Nous construisons un **monolithe full-stack Next.js (App Router) + TypeScript** (mode strict). Le
même projet sert le rendu (React Server/Client Components), l'API (Route Handlers + Server Actions)
et la logique métier (services + policies). Choix associés :
- **UI** : Tailwind CSS + shadcn/ui (Radix), drag & drop via **dnd-kit**, cache serveur via **TanStack Query**.
- **Données** : **Prisma** + **PostgreSQL** ; validation **Zod** partagée client/serveur.
- **Auth** : **Auth.js** (sessions + RBAC).
- **Pièces jointes** : stockage **S3-compatible** (MinIO en local).
- **Qualité** : **Vitest** (unit) + **Playwright** (e2e), ESLint + Prettier.
- **Déploiement** : **Dokploy** (Docker) sur OVH (`apps.rakoon.io`) - voir [`./0005-deploiement-dokploy-ovh.md`](./0005-deploiement-dokploy-ovh.md).

## Alternatives considérées
- **(A) Remix** - excellent modèle données/formulaires, mais écosystème de composants et
  intégrations moins fourni que Next ; bénéfice RSC/streaming moins net pour notre cas.
- **(B) SvelteKit** - plus léger et performant, mais écosystème Kanban/DnD et librairies de
  composants moins matures, et moindre familiarité de l'équipe.
- **(C) SPA Vite/React + API séparée (FastAPI/Express)** - la découpe front/back casse la type-safety
  de bout en bout, double le déploiement et alourdit la DX pour un gain nul à notre échelle.

## Conséquences
### Positives
- **Cohésion** : un dépôt, un langage, un pipeline.
- **Type-safety continue** (Zod + Prisma + TypeScript) qui réduit les bugs d'intégration.
- DX élevée et écosystème **shadcn** pour un rendu sobre/moderne immédiat.

### Négatives / compromis
- **Couplage** à l'écosystème Next.js.
- **Rendu RSC** (Server vs Client Components) à maîtriser pour éviter les pièges.
- Le monolithe devra être **découpé** si des besoins temps réel/scale émergent après la v1.

## Références
- Architecture (stack & couches) : [`../architecture.md`](../architecture.md)
- Vision (principes produit & stack résumée) : [`../vision.md`](../vision.md)
- Spécification produit : [`../../SPEC.md`](../../SPEC.md)
- ADR découlant de ce choix : [`./0002-workflow-kanban-personnalisable.md`](./0002-workflow-kanban-personnalisable.md) · [`./0003-rbac-admin-rapporteur.md`](./0003-rbac-admin-rapporteur.md) · [`./0004-pieces-jointes-paste-first.md`](./0004-pieces-jointes-paste-first.md)
