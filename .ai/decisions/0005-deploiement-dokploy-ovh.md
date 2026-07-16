# ADR-0005 - Déploiement : Dokploy (Docker) sur OVH, sous `apps.rakoon.io`
- **Statut** : Acceptée
- **Date** : 2026-07-09
- **Décideurs** : équipe Artemis

## Contexte
Artemis doit être déployé **« comme les autres applis Rakoon »**. L'infrastructure existante
est un serveur **OVH (AlmaLinux)** exécutant **Dokploy**, avec un reverse-proxy **Traefik** qui route
le wildcard **`*.apps.rakoon.io`** (DNS + certificats **Let's Encrypt** automatiques, challenge
HTTP-01). Les applis sœurs suivent ce modèle - ex. `rakoon-io/rakoon-tasker` exposée sur
`spark.apps.rakoon.io`. Le produit est un monolithe **Next.js `next start`** (port 3000) + **PostgreSQL**
+ un **stockage S3-compatible** pour les pièces jointes (voir [ADR-0004](./0004-pieces-jointes-paste-first.md)).

## Décision
Déploiement **conteneurisé** derrière le Traefik de Dokploy :
- **Image Docker multi-stage** (builder `node:20` → runner slim), **`Dockerfile` à la racine**,
  `next build` puis `next start` sur le port **3000**.
- **Sous-domaine dédié `tracker.apps.rakoon.io`** *(proposé, à confirmer)* routé par Traefik
  (`web` → `websecure`, `certResolver: letsencrypt`).
- Conteneurs sur le réseau overlay **`dokploy-network`** : l'app **`artemis`**, la base
  **`artemis-db`** (`postgres:16` + volume persistant) et, pour les pièces jointes, un
  stockage **S3-compatible** (**MinIO** `artemis-minio`, ou un bucket S3 externe).
- **Deux modes** (comme rakoon-tasker) : **(a)** direct **Docker + Traefik** piloté en SSH (rebuild
  manuel) ; **(b)** **Dokploy-managed** (auto-deploy sur `git push` via token API Dokploy).
  Le runbook complet est dans [`../../DEPLOY.md`](../../DEPLOY.md).

## Alternatives considérées
- **Vercel / plateforme managée** - écartée : l'app est **self-hostée** sur l'infra Rakoon existante
  (cohérence d'exploitation, maîtrise des coûts et des données). Vercel imposerait Postgres et
  stockage externes et sortirait du standard maison.
- **Kubernetes** - surdimensionné pour l'échelle et la taille de l'équipe ; Dokploy/Swarm suffit.
- **Auto-deploy Dokploy dès la v1** - repoussé : le mode direct Docker + Traefik est déjà maîtrisé
  sur les applis sœurs ; l'auto-deploy (option b) pourra être activé ensuite.

## Conséquences
### Positives
- **Cohérence** avec les autres applis Rakoon : même Traefik, même DNS wildcard, même modèle d'exploitation.
- **Self-hosting maîtrisé** : données et coûts sous contrôle, **HTTPS automatique** (Let's Encrypt).
- Chemin d'évolution clair vers l'**auto-deploy** (Dokploy-managed).

### Négatives / compromis
- **Rebuild manuel** en mode direct tant que l'option (b) n'est pas activée.
- Dépendance à l'**accès serveur (SSH)** et à la bonne santé de Traefik / `dokploy-network`.
- **Prérequis** : nécessite le **code applicatif scaffoldé** - le `Dockerfile` n'est pas fonctionnel
  tant que l'app n'existe pas ; le déploiement suit donc l'implémentation.

## Références
- Runbook de déploiement détaillé : [`../../DEPLOY.md`](../../DEPLOY.md)
- Modèle sœur : `rakoon-io/rakoon-tasker` → `spark.apps.rakoon.io`
- Stack & couches : [`../architecture.md`](../architecture.md)
- Pièces jointes / stockage S3 : [`./0004-pieces-jointes-paste-first.md`](./0004-pieces-jointes-paste-first.md)
- ADR socle (stack) : [`./0001-stack-nextjs-typescript.md`](./0001-stack-nextjs-typescript.md)
