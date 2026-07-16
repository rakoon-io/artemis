# Contexte - Artemis

> **Fichier vivant : à mettre à jour après chaque changement notable.**
> Il reflète l'**état courant** du projet, les **changements récents** et les **prochaines étapes**.
> À lire après [`vision.md`](./vision.md) (North Star), [`architecture.md`](./architecture.md) et
> [`rules.md`](./rules.md).

---

## État courant (au 2026-07-13)

- **Application v1 implémentée et vérifiée** (Next.js 16 / App Router / TypeScript strict, **npm**).
- Fonctionnalités livrées :
  - **Auth + RBAC** (Admin / Rapporteur), policies imposées côté serveur ;
  - **Projets** et **Kanban** (dnd-kit, drag & drop souris **et** clavier, ordre via `rank`) ;
  - **Tickets** avec **création rapide « paste »** (image / log / texte), **glisser-déposer de
    documents** (tous types) et **pièces jointes S3** ;
  - **Vue liste** + filtres ; **Sprints / lots** ;
  - **Paramètres (Admin)** : colonnes, labels, **types & priorités** de tickets, **couleur d'accent**,
    **réglages du projet** (nom / description) et **gestion des utilisateurs & rôles** ;
  - **Thème clair / sombre**.
- **Sécurité durcie (audit)** : inscription restreinte par domaine (`ALLOWED_EMAIL_DOMAINS`),
  autorisations pièces jointes + **clé S3 liée au ticket**, **échec au démarrage** si secrets manquants
  en prod, **en-têtes de sécurité**, **bcrypt 12**, cohérence projet, **rate-limiting** login /
  inscription.
- **Qualité vérifiée** : `typecheck`, `lint`, **build** de production, **9 tests unitaires Vitest**,
  **migration Prisma initiale + seed**, **smoke test** runtime - tous OK.
- **Outillage** : `Dockerfile` multi-stage (npm) + `.dockerignore` à la racine, **seed** Prisma
  (comptes de démo : `admin@rakoon.io` / `admin1234`, `rapporteur@rakoon.io` / `rapporteur1234`).
- **Dépôt GitHub** : **`rakoon-io/rakoon-tracker`** (privé).
- **Déploiement** : convention **Dokploy / Traefik** sur **`apps.rakoon.io`** documentée
  ([`../DEPLOY.md`](../DEPLOY.md), [ADR-0005](./decisions/0005-deploiement-dokploy-ovh.md)) -
  **pas encore réalisé** : accès SSH serveur confirmé (`rakoon-apps`), déploiement **reporté à la demande**.

## Changements récents

**Implémentation de la v1 (2026-07-09)** - développement complet de l'application Next.js (**npm**) :
auth + RBAC, projets, Kanban dnd-kit, tickets + création paste-first + pièces jointes S3, vue liste +
filtres, sprints / lots, paramètres (colonnes + labels), thème clair/sombre. Ajout de la **migration
Prisma initiale**, du **seed** (comptes de démo), des **tests unitaires Vitest**, du `Dockerfile`
(npm) + `.dockerignore`. Documentation (`README`, `AGENTS`, `DEPLOY`, Memory Bank) **synchronisée**
avec cette réalité (gestionnaire de paquets **npm** confirmé partout).

Documentation créée / mise à jour lors de l'initialisation :

- [`vision.md`](./vision.md) - North Star (objectif, valeur, périmètre, non-objectifs).
- [`architecture.md`](./architecture.md) - stack, structure cible, **modèle de données** canonique, patterns.
- [`rules.md`](./rules.md) - règles **DO / DON'T** de génération de code.
- [`context.md`](./context.md) - ce fichier (état courant / récents / prochaines étapes).
- [`decisions/`](./decisions/) - dossier ADR **+ 5 ADR** :
  - `0001-stack-nextjs-typescript.md`
  - `0002-workflow-kanban-personnalisable.md`
  - `0003-rbac-admin-rapporteur.md`
  - `0004-pieces-jointes-paste-first.md`
  - `0005-deploiement-dokploy-ovh.md` *(nouveau - cible de déploiement)*
- `specs/` - dossier de spécifications **+ 5 specs** (`0001`…`0005`).
- [`../AGENTS.md`](../AGENTS.md) - garde-fou « à lire avant toute modif ».
- [`../SPEC.md`](../SPEC.md) - cible produit détaillée de la v1.
- [`../README.md`](../README.md) - présentation & quickstart.
- [`../DEPLOY.md`](../DEPLOY.md) - **runbook Dokploy** (OVH / Traefik / `apps.rakoon.io`).
- [`../.gitignore`](../.gitignore) - exclusions Node/Next/Prisma + secrets.

## Prochaines étapes

1. **Documentation validée → commit initial + dépôt `rakoon-io/rakoon-tracker`** (fait).
2. **Scaffolding Next.js** (TypeScript + Tailwind CSS + shadcn/ui + Prisma + Auth.js + dnd-kit +
   Zod + Vitest) ; **`Dockerfile` + `.dockerignore`** à la racine (fait).
3. **Schéma Prisma + première migration** (User, Project, Column, Ticket, Sprint, Label,
   LabelOnTicket, Attachment, Comment) **+ seed** (fait).
4. **Auth + RBAC** : Auth.js + **policies serveur** (Admin / Rapporteur) (fait).
5. **CRUD tickets + création rapide « paste »** (pièce jointe collée : image / log / texte) (fait).
6. **Kanban** (dnd-kit) : drag & drop souris **et** clavier, ordre persistant via `rank` (fait).
7. **Sprints / lots** : backlog, planification, itérations (fait).
8. **Vue liste** : filtres, tri, recherche (fait).
9. **Personnalisation** : colonnes du workflow, labels, thème clair/sombre (fait).
10. **Premier déploiement** sur `tracker.apps.rakoon.io` - *à faire*, **bloqué sur l'accès serveur /
    Dokploy** (voir [`../DEPLOY.md`](../DEPLOY.md)).
11. **Polissage** : **tests e2e Playwright** + **CI** (`typecheck` + `lint` + `test`) ; notifications
    (hors v1).

## Décisions actées

Rappel synthétique (détail dans [`decisions/`](./decisions/)) :

- **[0001](./decisions/0001-stack-nextjs-typescript.md)** - Monolithe full-stack **Next.js / TypeScript**.
- **[0002](./decisions/0002-workflow-kanban-personnalisable.md)** - Workflow **Kanban personnalisable** (`Column` en base).
- **[0003](./decisions/0003-rbac-admin-rapporteur.md)** - **RBAC** 2 rôles (`ADMIN` / `REPORTER`), imposé côté serveur.
- **[0004](./decisions/0004-pieces-jointes-paste-first.md)** - Pièces jointes **« paste-first »** (presse-papier → URL presignée → S3).
- **[0005](./decisions/0005-deploiement-dokploy-ovh.md)** - Déploiement **Dokploy (Docker)** sur OVH, `tracker.apps.rakoon.io`.

## Questions ouvertes / à confirmer

| Question | Statut |
|----------|--------|
| **Sous-domaine** de déploiement : `tracker.apps.rakoon.io` proposé - à valider. | ⏳ à confirmer |
| **Accès serveur/Dokploy** - accès SSH confirmé (`rakoon-apps`) ; déploiement **reporté à la demande**. | |
| **Provider OAuth** éventuel, en complément de l'e-mail/mot de passe ? | ⏳ à trancher |
| **Appartenance aux projets** : table `ProjectMember` explicite ou visibilité à l'échelle de l'organisation en v1 ? | ⏳ à trancher |

---

> Références : [`vision.md`](./vision.md) · [`architecture.md`](./architecture.md) ·
> [`rules.md`](./rules.md) · [`decisions/`](./decisions/) · [`../SPEC.md`](../SPEC.md) ·
> [`../DEPLOY.md`](../DEPLOY.md) · [`../AGENTS.md`](../AGENTS.md)
