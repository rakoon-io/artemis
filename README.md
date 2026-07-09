# 🦝 Rakoon Tracker

> Suivi de tickets sobre, moderne et personnalisable, adapté à l'agile.

## 📌 Statut

> 🚧 **En cours d'initialisation (méthode AIDD) — documentation d'abord, code applicatif à venir.**
>
> Le dépôt ne contient pour l'instant que la **documentation** (Memory Bank, spec, guides). Le code
> Next.js (`src/`, `prisma/`…) sera généré lors de la phase de scaffolding. Les commandes de
> lancement ci-dessous sont donc une **cible** et ne sont **pas encore fonctionnelles**.

## ✨ Fonctionnalités (v1)

- 🎯 **Création rapide de ticket** ⭐ — formulaire minimal (titre obligatoire), le reste optionnel.
- 📋 **Pièce jointe par copier-coller** — coller une **image** du presse-papier, un **log** ou du
  **texte** directement dans le formulaire (fonction phare, ticket créé en < 30 s).
- 🗂️ **Vue Kanban configurable** — colonnes = statuts adaptables par projet, drag & drop souris
  **et** clavier (dnd-kit).
- 📑 **Vue liste** — filtres, tri multi-colonnes et recherche plein texte.
- 🏃 **Sprints / lots** — backlog, planification, itérations datées.
- 💬 **Commentaires** — fil de discussion par ticket.
- 📎 **Pièces jointes** — aperçu inline des images, téléchargement des logs/fichiers.
- 🎨 **Personnalisation** — workflow (colonnes), labels, thème clair/sombre.
- 👥 **Rôles Admin / Rapporteur** — RBAC extensible, **imposé côté serveur**.

Périmètre détaillé et non-objectifs v1 → [`SPEC.md`](./SPEC.md) et
[`.ai/vision.md`](./.ai/vision.md).

## 🛠️ Stack

- **Framework** : Next.js (App Router) · React · TypeScript (strict)
- **UI** : Tailwind CSS · shadcn/ui (Radix) · dnd-kit (Kanban)
- **Données** : Prisma · PostgreSQL · stockage **S3-compatible** (MinIO en local)
- **État & validation** : TanStack Query · Zod
- **Auth** : Auth.js (RBAC)
- **Qualité** : Vitest · Playwright · ESLint · Prettier
- **Déploiement** : Dokploy (Docker) sur `apps.rakoon.io` (comme les autres applis Rakoon)

Détails, couches et **modèle de données** → [`.ai/architecture.md`](./.ai/architecture.md).

## 📂 Structure du dépôt

```
rakoon-tracker/
├── AGENTS.md            # garde-fou "à lire avant toute modif" (pilote l'agent)
├── SPEC.md              # cible produit détaillée (v1)
├── README.md           # ce fichier — présentation & démarrage rapide
├── DEPLOY.md           # guide de déploiement Dokploy (apps.rakoon.io)
└── .ai/                 # ── Memory Bank ──
    ├── vision.md        # 🌟 North Star (à lire en premier)
    ├── context.md       # état courant / récents / prochaines étapes
    ├── architecture.md  # patterns, conventions, structure, modèle de données
    ├── rules.md         # règles DO / DON'T de génération de code
    ├── decisions/       # ADR (Architecture Decision Records)
    └── specs/           # spécifications par fonctionnalité
```

Le **Memory Bank** (`.ai/`) est la source de vérité documentaire qui **pilote la génération de
code** ; [`AGENTS.md`](./AGENTS.md) est le garde-fou à lire avant toute modification, qui renvoie
vers ce Memory Bank et impose le workflow.

> ℹ️ Le code applicatif **n'existe pas encore** : la structure cible du code (`src/`, `prisma/`…)
> est décrite dans
> [`.ai/architecture.md`](./.ai/architecture.md#structure-des-dossiers-cible).

## ▶️ Démarrage rapide

> ⚠️ **Commandes cible — à venir.** Elles ne fonctionneront **qu'après le scaffolding** du projet
> Next.js (aucun code applicatif présent pour l'instant). Gestionnaire de paquets : **pnpm**.

```bash
# Prérequis : Node.js LTS + pnpm + une base PostgreSQL (ou Docker)
pnpm install                 # installer les dépendances
cp .env.example .env         # configurer les variables d'environnement
pnpm prisma migrate dev      # créer / mettre à jour le schéma de base
pnpm dev                     # démarrer le serveur de développement

# Qualité
pnpm typecheck               # tsc --noEmit
pnpm lint                    # ESLint
pnpm test                    # Vitest (unit) + Playwright (e2e)
```

## 🔄 Méthode AIDD

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

## 🚀 Déploiement

**Dokploy** (Docker) sur `apps.rakoon.io`, comme les autres applis Rakoon. Voir le guide → [`DEPLOY.md`](./DEPLOY.md).

## 🤝 Contribution

- Respecter les **règles DO / DON'T** de [`.ai/rules.md`](./.ai/rules.md).
- Suivre le **workflow 7 phases** (ci-dessus) : pas de code avant validation du plan.
- Messages de commit au format
  [**Conventional Commits**](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`…).
- Toute décision structurante ⇒ un ADR dans [`.ai/decisions/`](./.ai/decisions/) ; après un
  changement notable, mettre à jour [`.ai/context.md`](./.ai/context.md).

## 📄 Licence

À définir.
