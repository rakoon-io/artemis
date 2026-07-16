# AGENTS.md

> ## À lire avant toute modif
> Avant d'écrire ou de modifier quoi que ce soit dans ce dépôt :
> 1. Lis le **Memory Bank** dans l'ordre : [`.ai/vision.md`](./.ai/vision.md) (North Star) →
>    [`.ai/architecture.md`](./.ai/architecture.md) → [`.ai/rules.md`](./.ai/rules.md) →
>    [`.ai/context.md`](./.ai/context.md) (état courant).
> 2. Respecte les **règles DO/DON'T** de [`.ai/rules.md`](./.ai/rules.md).
> 3. Toute décision structurante ⇒ un **ADR** dans [`.ai/decisions/`](./.ai/decisions/).
> 4. Après un changement notable, **mets à jour** [`.ai/context.md`](./.ai/context.md).
> 5. Suis le **workflow 7 phases** (voir plus bas) : **ne code pas** avant validation du plan.

---

## Objectif

**Artemis** - outil interne de **suivi de tickets** sobre, moderne, efficace et
personnalisable, adapté à une **méthode agile** (Kanban, vue liste, sprints/lots). Priorité produit :
**créer un ticket sans friction** (pièce jointe par copier-coller : image, log, texte).

Cible produit détaillée → **[`SPEC.md`](./SPEC.md)**.

## Décisions clés (avec rationale)

| Décision | Rationale | ADR |
|----------|-----------|-----|
| **Monolithe full-stack Next.js / TypeScript** | Cohésion, type-safety bout en bout, DX élevée, écosystème UI (shadcn) pour un rendu sobre/moderne/personnalisable. | [0001](./.ai/decisions/0001-stack-nextjs-typescript.md) |
| **Workflow Kanban personnalisable** (colonnes en base, pas de statuts codés en dur) | La personnalisation du flux est une exigence produit. | [0002](./.ai/decisions/0002-workflow-kanban-personnalisable.md) |
| **RBAC à 2 rôles extensible** (Admin/Rapporteur) | Simple en v1, sans fermer la porte à d'autres rôles ; autorisation **imposée côté serveur**. | [0003](./.ai/decisions/0003-rbac-admin-rapporteur.md) |
| **Pièces jointes « paste-first »** (presse-papier → URL presignée → S3) | Friction minimale à la création, stockage scalable. | [0004](./.ai/decisions/0004-pieces-jointes-paste-first.md) |
| **Déploiement Dokploy (Docker)** sur `apps.rakoon.io` | Cohérence avec les autres applis Rakoon ; self-hosting maîtrisé, HTTPS via Traefik/Let's Encrypt. | [0005](./.ai/decisions/0005-deploiement-dokploy-ovh.md) |

## Architecture (schéma de la stack)

```
                       ┌───────────────────────────────┐
   Présentation        │  React · shadcn/ui · Tailwind  │
                       │  dnd-kit (Kanban) · TanStack Q │
                       └───────────────┬───────────────┘
                                       │
   Application         ┌───────────────▼───────────────┐
   (Next.js App Router)│ Route Handlers · Server Actions│
                       │        Auth.js (RBAC)          │
                       └───────────────┬───────────────┘
                                       │
   Métier              ┌───────────────▼───────────────┐
                       │  services · policies · Zod     │
                       └───────┬───────────────┬────────┘
                               │ Prisma        │ SDK S3
                       ┌───────▼──────┐ ┌───────▼─────────┐
   Données             │  PostgreSQL  │ │ S3-compatible   │
                       │              │ │ (pièces jointes)│
                       └──────────────┘ └─────────────────┘
```

Détails, couches et **modèle de données** → [`.ai/architecture.md`](./.ai/architecture.md).

## Structure des dossiers

```
artemis/
├── AGENTS.md            # ce fichier - garde-fou "à lire avant toute modif"
├── SPEC.md              # cible produit détaillée
├── README.md           # présentation & quickstart
├── DEPLOY.md           # déploiement Dokploy (apps.rakoon.io)
└── .ai/                 # ── Memory Bank ──
    ├── vision.md        # North Star (à lire en premier)
    ├── context.md       # état courant / récents / prochaines étapes
    ├── architecture.md  # patterns, conventions, structure, modèle de données
    ├── rules.md         # règles DO / DON'T de génération de code
    ├── decisions/       # ADR (Architecture Decision Records)
    └── specs/           # spécifications par fonctionnalité
```

> Le code applicatif (`src/`, `prisma/`…) est **désormais en place** (v1 implémentée). Sa structure
> est décrite dans
> [`.ai/architecture.md`](./.ai/architecture.md#structure-des-dossiers-cible).

## ▶️ Comment lancer

> Gestionnaire de paquets : **npm** (`package-lock.json`), aligné sur les autres applis Rakoon.

```bash
# Prérequis : Node.js LTS + npm + une base PostgreSQL (ou Docker)
npm install                  # installer les dépendances
cp .env.example .env         # configurer les variables d'environnement
npx prisma migrate dev       # créer/mettre à jour le schéma de base
npm run db:seed              # jeu de données de démo (comptes Admin / Rapporteur)
npm run dev                  # démarrer le serveur de développement

# Qualité
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint
npm test                     # Vitest (unit)
```

Déploiement → [`DEPLOY.md`](./DEPLOY.md).

## Workflow (méthode AIDD - 7 phases)

`Idéation → Plan → [validation] → Implémentation → Vérification (typecheck/tests/lint) →
[validation] Commit → Revue finale`

- **Ne code rien tant que le plan n'est pas validé.**
- La **Vérification** exécute `typecheck` + `lint` + `test` avant tout commit.
- Chaque décision structurante ⇒ **ADR** ; chaque fonctionnalité ⇒ **spec** dans `.ai/specs/`.
