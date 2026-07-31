# Artemis

> Suivi de tickets sobre, moderne et personnalisable, adapté à l'agile.

[![Demo en ligne](https://img.shields.io/badge/demo-en_ligne-5f4ec2.svg)](https://artemis.apps.rakoon.io)
&nbsp;[![Licence : MIT](https://img.shields.io/badge/licence-MIT-green.svg)](./LICENSE)
&nbsp;![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)
&nbsp;![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
&nbsp;![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169e1.svg)

**Demo en ligne** : https://artemis.apps.rakoon.io (comptes de demonstration ci-dessous).

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
- **Modules fonctionnels** - un niveau au-dessus des composants : les grands domaines du produit
  (suivi des tickets, documentation, administration...), qui regroupent plusieurs composants.
  C'est de la **structure produit**, pas un lot de travail : un module ne se **termine** jamais,
  contrairement a un sprint. Facultatif de bout en bout.
- **Composants applicatifs** - chaque projet declare le catalogue des composants dont son
  application est faite (une **page**, un **composant reutilisable**, un **service**), chacun
  rattachable a un module ; un ticket peut en referencer un pour situer la demande, filtrer les
  vues et donner du contexte a l'IA. Son module est alors celui de son composant : un ticket ne
  porte son propre module que lorsqu'il n'a aucun composant.
- **Wiki de projet** - documentation en Markdown etendu, recherche, citation de tickets avec `@`.
- **Commentaires** - fil de discussion par ticket.
- **Pieces jointes** - vignettes des images, telechargement des logs et fichiers.
- **Controle d'acces par projet** - chaque projet a ses membres ; l'admin voit tout.
- **Assistant via MCP** - un serveur MCP permet a un assistant de prendre en
  charge des tickets (au nom d'un compte de service, memes regles d'acces). Voir
  [`MCP.md`](./MCP.md).
- **Notifications par e-mail** - les concernes (rapporteur, assigne) sont
  prevenus par e-mail (Mailjet) sur les evenements cles : nouveau commentaire,
  assignation. Optionnel, configure par variables d'environnement.
- **Personnalisation** - workflow (colonnes), labels, types, priorites, modules, composants,
  themes clair/sombre.
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

**Comptes de demo** (crees par le seed) : `admin@rakoon.io` (Admin) et
`rapporteur@rakoon.io` (Rapporteur).

Leurs mots de passe viennent de `SEED_ADMIN_PASSWORD` / `SEED_REPORTER_PASSWORD`.
Sans ces variables, le seed en engendre au hasard et les **affiche une fois** a
la fin de son execution - notez-les. En production, il refuse de s'executer sans
elles : un mot de passe ecrit dans un depot est un mot de passe publie.

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

## Notifications par e-mail

Optionnelles, via **Mailjet**. Renseignez ces variables d'environnement pour
activer l'envoi (sinon, les notifications sont silencieusement desactivees) :

```bash
MAILJET_API_KEY=""        # cle publique Mailjet
MAILJET_API_SECRET=""     # cle privee Mailjet
EMAIL_FROM="noreply@rakoon.io"   # adresse expeditrice validee cote Mailjet
EMAIL_FROM_NAME="Artemis"
APP_URL="https://artemis.apps.rakoon.io"   # base des liens dans les e-mails
```

Les concernes (rapporteur et assigne du ticket) recoivent un e-mail lors d'un
nouveau commentaire ou d'une assignation ; on ne notifie jamais l'auteur de l'action.

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
