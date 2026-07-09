# 🧭 Contexte — Rakoon Tracker

> **Fichier vivant : à mettre à jour après chaque changement notable.**
> Il reflète l'**état courant** du projet, les **changements récents** et les **prochaines étapes**.
> À lire après [`vision.md`](./vision.md) (North Star), [`architecture.md`](./architecture.md) et
> [`rules.md`](./rules.md).

---

## 📍 État courant (au 2026-07-09)

- Projet **initialisé selon la méthode AIDD** (documentation d'abord, code ensuite).
- **Memory Bank** (`.ai/`) et **docs racine** créés et cohérents entre eux.
- **Dépôt GitHub** : **`rakoon-io/rakoon-tracker`** (privé), commit initial de la documentation poussé.
- **Aucun code applicatif** pour l'instant — `src/`, `prisma/`… restent à générer.
- **Déploiement** : convention **Dokploy / Traefik** sur **`apps.rakoon.io`** documentée
  ([`../DEPLOY.md`](../DEPLOY.md), [ADR-0005](./decisions/0005-deploiement-dokploy-ovh.md)) —
  **exécutable seulement après le scaffolding** (pas de code à déployer aujourd'hui).

## 🆕 Changements récents

Documentation créée / mise à jour lors de l'initialisation :

- [`vision.md`](./vision.md) — 🌟 North Star (objectif, valeur, périmètre, non-objectifs).
- [`architecture.md`](./architecture.md) — stack, structure cible, **modèle de données** canonique, patterns.
- [`rules.md`](./rules.md) — règles **DO / DON'T** de génération de code.
- [`context.md`](./context.md) — ce fichier (état courant / récents / prochaines étapes).
- [`decisions/`](./decisions/) — dossier ADR **+ 5 ADR** :
  - `0001-stack-nextjs-typescript.md`
  - `0002-workflow-kanban-personnalisable.md`
  - `0003-rbac-admin-rapporteur.md`
  - `0004-pieces-jointes-paste-first.md`
  - `0005-deploiement-dokploy-ovh.md` *(nouveau — cible de déploiement)*
- `specs/` — dossier de spécifications **+ 5 specs** (`0001`…`0005`).
- [`../AGENTS.md`](../AGENTS.md) — garde-fou « à lire avant toute modif ».
- [`../SPEC.md`](../SPEC.md) — cible produit détaillée de la v1.
- [`../README.md`](../README.md) — présentation & quickstart.
- [`../DEPLOY.md`](../DEPLOY.md) — **runbook Dokploy** (OVH / Traefik / `apps.rakoon.io`).
- [`../.gitignore`](../.gitignore) — exclusions Node/Next/Prisma + secrets.

## 🔜 Prochaines étapes

1. ✅ **Documentation validée → commit initial + dépôt `rakoon-io/rakoon-tracker`** (fait).
2. **Scaffolding Next.js** : `create-next-app` (TypeScript) + Tailwind CSS + shadcn/ui + Prisma +
   Auth.js + dnd-kit + Zod + Vitest + Playwright ; ajout du **`Dockerfile` + `.dockerignore`** (cf. DEPLOY.md).
3. **Schéma Prisma + première migration** (entités : User, Project, Column, Ticket, Sprint, Label,
   LabelOnTicket, Attachment, Comment).
4. **Auth + RBAC** : Auth.js + **policies serveur** (Admin / Rapporteur).
5. **CRUD tickets + création rapide « paste »** (pièce jointe collée : image / log / texte).
6. **Kanban** (dnd-kit) : drag & drop souris **et** clavier, ordre persistant via `rank` (lexorank).
7. **Sprints / lots** : backlog, planification, itérations.
8. **Vue liste** : filtres, tri, recherche.
9. **Personnalisation** : colonnes du workflow, labels, thème clair/sombre.
10. **Tests e2e** (Playwright) **+ CI** (`typecheck` + `lint` + `test`).
11. **Premier déploiement** sur `tracker.apps.rakoon.io` (voir [`../DEPLOY.md`](../DEPLOY.md)).

## 🧭 Décisions actées

Rappel synthétique (détail dans [`decisions/`](./decisions/)) :

- **[0001](./decisions/0001-stack-nextjs-typescript.md)** — Monolithe full-stack **Next.js / TypeScript**.
- **[0002](./decisions/0002-workflow-kanban-personnalisable.md)** — Workflow **Kanban personnalisable** (`Column` en base).
- **[0003](./decisions/0003-rbac-admin-rapporteur.md)** — **RBAC** 2 rôles (`ADMIN` / `REPORTER`), imposé côté serveur.
- **[0004](./decisions/0004-pieces-jointes-paste-first.md)** — Pièces jointes **« paste-first »** (presse-papier → URL presignée → S3).
- **[0005](./decisions/0005-deploiement-dokploy-ovh.md)** — Déploiement **Dokploy (Docker)** sur OVH, `tracker.apps.rakoon.io`.

## ❓ Questions ouvertes / à confirmer

| Question | Statut |
|----------|--------|
| **Sous-domaine** de déploiement : `tracker.apps.rakoon.io` proposé — à valider. | ⏳ à confirmer |
| **Accès serveur/Dokploy** pour le déploiement (SSH ou token API Dokploy) — qui/comment ? | ⏳ à confirmer |
| **Provider OAuth** éventuel, en complément de l'e-mail/mot de passe ? | ⏳ à trancher |
| **Appartenance aux projets** : table `ProjectMember` explicite ou visibilité à l'échelle de l'organisation en v1 ? | ⏳ à trancher |

---

> Références : [`vision.md`](./vision.md) · [`architecture.md`](./architecture.md) ·
> [`rules.md`](./rules.md) · [`decisions/`](./decisions/) · [`../SPEC.md`](../SPEC.md) ·
> [`../DEPLOY.md`](../DEPLOY.md) · [`../AGENTS.md`](../AGENTS.md)
