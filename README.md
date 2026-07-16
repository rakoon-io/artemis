# Artemis

> Suivi de tickets sobre, moderne et personnalisable, adapté à l'agile.

[![Licence : MIT](https://img.shields.io/badge/licence-MIT-green.svg)](./LICENSE)
&nbsp;![Next.js 16](https://img.shields.io/badge/Next.js-16-black.svg)
&nbsp;![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)
&nbsp;![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169e1.svg)

## Statut

> **Application v1 implémentée et vérifiée.**
>
> Le code applicatif est en place : **Next.js 16** (App Router), **Prisma / PostgreSQL**, **Auth.js**
> (RBAC Admin / Rapporteur), **Kanban** (dnd-kit), **création paste-first** et vues **liste**,
> **sprints / lots** et **paramètres**. Les commandes de démarrage ci-dessous sont fonctionnelles.
> Reste à faire : le **premier déploiement** sur `tracker.apps.rakoon.io` (voir
> [`.ai/context.md`](./.ai/context.md)).

## Fonctionnalités (v1)

- **Création rapide de ticket** - formulaire minimal (titre obligatoire), le reste optionnel.
- **Pièce jointe par copier-coller** - coller une **image** du presse-papier, un **log** ou du
  **texte** directement dans le formulaire (fonction phare, ticket créé en < 30 s).
- **Vue Kanban configurable** - colonnes = statuts adaptables par projet, drag & drop souris
  **et** clavier (dnd-kit).
- **Vue liste** - filtres, tri multi-colonnes et recherche plein texte.
- **Sprints / lots** - backlog, planification, itérations datées.
- **Commentaires** - fil de discussion par ticket.
- **Pièces jointes** - aperçu inline des images, téléchargement des logs/fichiers.
- **Personnalisation** - workflow (colonnes), labels, thème clair/sombre.
- **Rôles Admin / Rapporteur** - RBAC extensible, **imposé côté serveur**.

Périmètre détaillé et non-objectifs v1 → [`SPEC.md`](./SPEC.md) et
[`.ai/vision.md`](./.ai/vision.md).

## Stack

- **Framework** : Next.js (App Router) · React · TypeScript (strict)
- **UI** : Tailwind CSS · shadcn/ui (Radix) · dnd-kit (Kanban)
- **Données** : Prisma · PostgreSQL · stockage **S3-compatible** (MinIO en local)
- **État & validation** : TanStack Query · Zod
- **Auth** : Auth.js (RBAC)
- **Qualité** : Vitest · Playwright · ESLint · Prettier
- **Déploiement** : Dokploy (Docker) sur `apps.rakoon.io` (comme les autres applis Rakoon)

Détails, couches et **modèle de données** → [`.ai/architecture.md`](./.ai/architecture.md).

## Structure du dépôt

```
rakoon-tracker/
├── AGENTS.md            # garde-fou "à lire avant toute modif" (pilote l'agent)
├── SPEC.md              # cible produit détaillée (v1)
├── README.md           # ce fichier - présentation & démarrage rapide
├── DEPLOY.md           # guide de déploiement Dokploy (apps.rakoon.io)
└── .ai/                 # ── Memory Bank ──
    ├── vision.md        # North Star (à lire en premier)
    ├── context.md       # état courant / récents / prochaines étapes
    ├── architecture.md  # patterns, conventions, structure, modèle de données
    ├── rules.md         # règles DO / DON'T de génération de code
    ├── decisions/       # ADR (Architecture Decision Records)
    └── specs/           # spécifications par fonctionnalité
```

Le **Memory Bank** (`.ai/`) est la source de vérité documentaire qui **pilote la génération de
code** ; [`AGENTS.md`](./AGENTS.md) est le garde-fou à lire avant toute modification, qui renvoie
vers ce Memory Bank et impose le workflow.

> ℹ️ Le code applicatif (`src/`, `prisma/`…) est **désormais en place** ; sa structure est décrite
> dans [`.ai/architecture.md`](./.ai/architecture.md#structure-des-dossiers-cible).

## ▶️ Démarrage rapide

> Gestionnaire de paquets : **npm** (`package-lock.json`), aligné sur les autres applis Rakoon.

```bash
# Prérequis : Node.js LTS + npm + une base PostgreSQL (ou Docker)
npm install                  # installer les dépendances
cp .env.example .env         # configurer les variables d'environnement
npx prisma migrate dev       # créer / mettre à jour le schéma de base
npm run db:seed              # jeu de données de démo (comptes ci-dessous)
npm run dev                  # démarrer le serveur (http://localhost:3000)
```

**Comptes de démo** (créés par le seed) :

- **Admin** - `admin@rakoon.io` / `admin1234`
- **Rapporteur** - `rapporteur@rakoon.io` / `rapporteur1234`

```bash
# Qualité
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm test                     # Vitest (unit)
```

**Qualité vérifiée** (v1) : `typecheck`, `lint`, `build` de production, **tests** unitaires (Vitest),
**migration** Prisma, **seed** et **smoke test** runtime - tous OK.

## Méthode AIDD

**AIDD** (*AI-Driven Development*) : la **documentation pilote le développement**. Le Memory Bank
(`.ai/`) décrit la vision, l'architecture et les règles ; un agent IA génère puis vérifie le code
en suivant un **workflow en phases** ponctué de **points de validation humaine**.

**Workflow 7 phases :**

```
Idéation → Plan → [validation] → Implémentation → Vérification (typecheck/tests/lint) →
[validation] Commit → Revue finale
```

- **Ne rien coder tant que le plan n'est pas validé.**
- La **Vérification** exécute `typecheck` + `lint` + `test` avant tout commit.
- Chaque décision structurante ⇒ un **ADR** dans [`.ai/decisions/`](./.ai/decisions/) ; chaque
  fonctionnalité ⇒ une **spec** dans [`.ai/specs/`](./.ai/specs/).

À lire pour démarrer : [`AGENTS.md`](./AGENTS.md), [`SPEC.md`](./SPEC.md) et
[`.ai/vision.md`](./.ai/vision.md).

## Déploiement

**Dokploy** (Docker) sur `apps.rakoon.io`, comme les autres applis Rakoon. Voir le guide → [`DEPLOY.md`](./DEPLOY.md).

## Contribution

- Respecter les **règles DO / DON'T** de [`.ai/rules.md`](./.ai/rules.md).
- Suivre le **workflow 7 phases** (ci-dessus) : pas de code avant validation du plan.
- Messages de commit au format
  [**Conventional Commits**](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`…).
- Toute décision structurante ⇒ un ADR dans [`.ai/decisions/`](./.ai/decisions/) ; après un
  changement notable, mettre à jour [`.ai/context.md`](./.ai/context.md).

## Licence

Distribué sous licence **MIT** - voir [`LICENSE`](./LICENSE). Contributions bienvenues.
