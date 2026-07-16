# Artemis

> Suivi de tickets sobre, moderne et personnalisable, adapté à l'agile.

[![Licence : MIT](https://img.shields.io/badge/licence-MIT-green.svg)](./LICENSE)
&nbsp;![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)
&nbsp;![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
&nbsp;![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169e1.svg)

Artemis est un outil de suivi de tickets pour equipes agiles : creation de ticket
sans friction, tableau Kanban configurable, sprints et lots, wiki de projet, le
tout self-hostable (Docker + PostgreSQL).

## Fonctionnalites

- **Creation rapide de ticket** - formulaire minimal (titre obligatoire), le reste optionnel.
- **Piece jointe par copier-coller** - coller une **image** du presse-papier, un **log** ou du
  **texte** directement dans le formulaire, ticket cree en quelques secondes.
- **Vue Kanban configurable** - colonnes = statuts adaptables par projet, glisser-deposer souris
  **et** clavier (dnd-kit).
- **Vue liste** - filtres, tri multi-colonnes et recherche plein texte.
- **Sprints / lots** - backlog, planification, iterations datees, reouverture.
- **Wiki de projet** - documentation en Markdown etendu, recherche, citation de tickets avec `@`.
- **Commentaires** - fil de discussion par ticket.
- **Pieces jointes** - vignettes des images, telechargement des logs et fichiers.
- **Controle d'acces par projet** - chaque projet a ses membres ; l'admin voit tout.
- **Assistant via MCP** - un serveur MCP permet a un assistant de prendre en
  charge des tickets (au nom d'un compte de service, memes regles d'acces). Voir
  [`MCP.md`](./MCP.md).
- **Personnalisation** - workflow (colonnes), labels, types, priorites, themes clair/sombre.
- **Roles Admin / Rapporteur** - RBAC extensible, **impose cote serveur**.

## Stack

- **Framework** : Next.js (App Router) - React - TypeScript (strict)
- **UI** : Tailwind CSS - shadcn/ui (Radix) - dnd-kit (Kanban)
- **Donnees** : Prisma - PostgreSQL - stockage **S3-compatible** (MinIO en local)
- **Etat & validation** : TanStack Query - Zod
- **Auth** : Auth.js (RBAC)
- **Qualite** : Vitest - Playwright - ESLint - Prettier
- **Deploiement** : Dokploy (Docker) sur `apps.rakoon.io`

## Demarrage rapide

> Gestionnaire de paquets : **npm** (`package-lock.json`).

```bash
# Prerequis : Node.js LTS + npm + une base PostgreSQL (ou Docker)
npm install                  # installer les dependances
cp .env.example .env         # configurer les variables d'environnement
npx prisma migrate dev       # creer / mettre a jour le schema de base
npm run db:seed              # jeu de donnees de demo (comptes ci-dessous)
npm run dev                  # demarrer le serveur (http://localhost:3000)
```

**Comptes de demo** (crees par le seed) :

- **Admin** - `admin@rakoon.io` / `admin1234`
- **Rapporteur** - `rapporteur@rakoon.io` / `rapporteur1234`

```bash
# Qualite
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm test                     # Vitest (unit)
npm run build                # build de production
```

## Structure du depot

```
artemis/
├── src/            # application Next.js (App Router)
│   ├── app/        # routes (RSC), API et layouts
│   ├── components/ # composants UI
│   ├── server/     # services, actions et acces donnees
│   └── lib/        # utilitaires, policies RBAC, validateurs Zod
├── prisma/         # schema, migrations et seed
├── SPEC.md         # cible produit detaillee
├── MCP.md          # serveur MCP (assistant IA sur les tickets)
└── DEPLOY.md       # guide de deploiement
```

`src/mcp/` contient le serveur MCP (lance par `npm run mcp`) ; voir
[`MCP.md`](./MCP.md).

## Deploiement

**Dokploy** (Docker) sur `apps.rakoon.io`. Voir le guide -> [`DEPLOY.md`](./DEPLOY.md).

## Contribution

- Messages de commit au format
  [**Conventional Commits**](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`).
- Avant tout commit : `typecheck`, `lint` et `test` doivent passer.
- Regle d'or de securite : **l'UI masque, le serveur impose**. Toute mutation passe par une
  autorisation cote serveur.

## Licence

Distribue sous licence **MIT** - voir [`LICENSE`](./LICENSE). Contributions bienvenues.
