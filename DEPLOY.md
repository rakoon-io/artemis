# Déploiement - Artemis

> Déploiement **« comme les autres applis Rakoon »** : serveur **OVH + Dokploy**, reverse-proxy
> **Traefik** sur le wildcard **`*.apps.rakoon.io`**.
>
> L'application (Next.js, **npm**) fournit `package.json` + `package-lock.json`, `src/`,
> `prisma/` (schéma + migrations) et un **`Dockerfile` multi-stage** à la racine.

Vue produit -> [`README.md`](./README.md) - schéma de données -> [`prisma/schema.prisma`](./prisma/schema.prisma).

## 1. Cible & modèle

- **Sous-domaine** : **`artemis.apps.rakoon.io`** *(ex. `rakoon-tasker` = `spark.apps.rakoon.io`)*.
- **Reverse-proxy** : Traefik de Dokploy (`web` :80 → `websecure` :443, `certResolver: letsencrypt`).
- **Réseau** : overlay Swarm **`dokploy-network`** (résolution des conteneurs par leur nom).

```
Internet ──HTTPS──> Traefik (dokploy-traefik, :80/:443)
                      │  route artemis.apps.rakoon.io  (Let's Encrypt)
                      ▼
        artemis (Next.js « next start », :3000)
             ├──► artemis-db     (postgres:16)     vol: artemis-db-data
             └──► artemis-minio  (S3-compatible)   vol: artemis-minio-data
                        réseau overlay « dokploy-network »
```

## 2. Prérequis

**Serveur (déjà en place, cf. rakoon-tasker)** : Docker + Docker Swarm, réseau `dokploy-network`,
Traefik Dokploy avec resolver ACME `letsencrypt`, DNS wildcard `*.apps.rakoon.io` → IP du serveur,
accès SSH root/sudo.

**Application (présente à la racine)** : projet Next.js (App Router, `next start`),
`package.json` + `package-lock.json`, `prisma/schema.prisma` + migrations, `Dockerfile` + `.dockerignore`.

## 3. Variables d'environnement

> Validées via Zod (`lib/env.ts`). **Ne jamais committer de secret** (`.env*` est gitignoré ; utiliser
> un fichier serveur ou les secrets Dokploy).

| Variable | Requis | Rôle |
|---|:--:|---|
| `DATABASE_URL` | | Postgres interne (`artemis-db:5432`) |
| `AUTH_SECRET` | | Secret Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | | `https://artemis.apps.rakoon.io` |
| `AUTH_TRUST_HOST` | | `true` (derrière le proxy Traefik) |
| `S3_ENDPOINT` | | Endpoint stockage pièces jointes (`http://artemis-minio:9000`) |
| `S3_BUCKET` | | Bucket des pièces jointes (`artemis-attachments`) |
| `S3_ACCESS_KEY_ID` | | Clé d'accès au stockage objet |
| `S3_SECRET_ACCESS_KEY` | | Clé secrète du stockage objet |
| `S3_REGION` | | Région du bucket (`us-east-1` par défaut, même avec MinIO) |

## 4. Dockerfile (multi-stage)

Le **`Dockerfile` multi-stage (npm) est à la racine du dépôt** - inutile de le recopier ici.

En résumé :

- **Builder** (`node:20-bookworm`) : `npm ci` → `npx prisma generate` → build en `NODE_ENV=production`
  (`npm run build`, avec des placeholders `DATABASE_URL` / `AUTH_SECRET` surchargés au runtime).
- **Runner** (`node:20-bookworm-slim`) : ne copie que `.next`, `node_modules`, `public` et `prisma`,
  expose le **port 3000** et démarre `npm run start`.

Un `.dockerignore` (à la racine) exclut `node_modules`, `.next`, `.git`, `.env*`, `.ai`, `*.md`,
`coverage`.

## 5. Déploiement direct (Docker + Traefik) - exécuté sur le serveur en `sudo`

### 5.1 - Base PostgreSQL dédiée
```bash
DBPW=$(openssl rand -hex 20)
docker run -d --name artemis-db --restart unless-stopped \
  --network dokploy-network \
  -e POSTGRES_USER=tracker -e POSTGRES_PASSWORD="$DBPW" -e POSTGRES_DB=tracker \
  -v artemis-db-data:/var/lib/postgresql/data \
  postgres:16
# DATABASE_URL = postgresql://tracker:$DBPW@artemis-db:5432/tracker?schema=public
```

### 5.2 - Stockage S3-compatible (MinIO) pour les pièces jointes
```bash
MINIO_PW=$(openssl rand -hex 20)
docker run -d --name artemis-minio --restart unless-stopped \
  --network dokploy-network \
  -e MINIO_ROOT_USER=tracker -e MINIO_ROOT_PASSWORD="$MINIO_PW" \
  -v artemis-minio-data:/data \
  minio/minio server /data --console-address ":9001"
# Puis créer le bucket "artemis-attachments" (via `mc`, ou au démarrage de l'app).
```

### 5.3 - Build de l'image (contexte = source du repo + Dockerfile)
```bash
docker build -t artemis:latest /chemin/vers/le/contexte
```

### 5.4 - Fichier d'environnement `rtr.env`
```ini
NODE_ENV=production
DATABASE_URL=postgresql://tracker:<DBPW>@artemis-db:5432/tracker?schema=public
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://artemis.apps.rakoon.io
AUTH_TRUST_HOST=true
S3_ENDPOINT=http://artemis-minio:9000
S3_BUCKET=artemis-attachments
S3_ACCESS_KEY_ID=tracker
S3_SECRET_ACCESS_KEY=<MINIO_PW>
S3_REGION=us-east-1
```

### 5.5 - Migrations Prisma
```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  artemis:latest npx prisma migrate deploy
```

Reprise ponctuelle apres la migration `20260730180000_add_wiki_slug` : elle donne
une URL lisible (`?page=guide-du-projet`) aux pages de wiki creees auparavant.
Le script est idempotent, on peut le rejouer sans risque.

```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  artemis:latest npm run db:backfill-slugs
```

### 5.6 - Lancement du conteneur applicatif
```bash
docker rm -f artemis 2>/dev/null
docker run -d --name artemis --restart unless-stopped \
  --network dokploy-network --env-file rtr.env \
  artemis:latest
```

### 5.7 - Route Traefik (HTTPS auto)
Fichier **`/etc/dokploy/traefik/dynamic/artemis.yml`** (rechargé à chaud) :
```yaml
http:
  routers:
    artemis-secure:
      rule: Host(`artemis.apps.rakoon.io`)
      entryPoints: [websecure]
      service: artemis
      tls:
        certResolver: letsencrypt
    artemis-web:
      rule: Host(`artemis.apps.rakoon.io`)
      entryPoints: [web]
      middlewares: [redirect-to-https]
      service: artemis
  services:
    artemis:
      loadBalancer:
        servers:
          - url: http://artemis:3000
```
Traefik obtient alors automatiquement le certificat Let's Encrypt (HTTP-01).

### 5.8 - Compte admin initial
Un **script de seed** (`npm run db:seed`, ou `npx prisma db seed`) crée les comptes de démo (Admin +
Rapporteur). En production, l'exécuter une fois via un conteneur jetable (comme en 5.5) **puis
changer les mots de passe** :
```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  artemis:latest npm run db:seed
```

## 6. Mise à jour / redéploiement
```bash
docker build -t artemis:latest <contexte>
# si le schéma Prisma a changé : rejouer 5.5 (migrate deploy)
docker rm -f artemis
docker run -d --name artemis --restart unless-stopped \
  --network dokploy-network --env-file rtr.env artemis:latest
```
La route Traefik, la base et le stockage ne bougent pas (volumes persistants).

## 7. Option Dokploy-managed (auto-deploy sur `git push`)
1. Générer un **token API Dokploy** (Settings → API).
2. Connecter GitHub à Dokploy (App GitHub ou deploy key) sur **`rakoon-io/artemis`**.
3. Créer l'application Dokploy (source Git), y reporter les variables du §3, rattacher Postgres + MinIO.
4. Chaque `git push` sur la branche de déploiement déclenche alors build + déploiement automatiques.

## 8. Vérifications post-déploiement
- **Healthcheck** : l'application répond `200` (endpoint de santé à prévoir).
- **Smoke test** : connexion → création d'un ticket avec **image collée** → déplacement d'une carte
  en Kanban → filtre en vue liste.
- **TLS** : certificat Let's Encrypt actif sur `https://artemis.apps.rakoon.io`.

## 9. Rollback
Redéployer l'image précédente (`artemis:<tag-précédent>`) ; si le schéma a changé, restaurer
la base (volume `artemis-db-data` / sauvegarde). Documenter la procédure exacte une fois la
CI/CD en place.

## 10. Sécurité & secrets
- `.env*` et `rtr.env` **jamais commités** (gitignore).
- Pièces jointes servies via **URLs presignées à durée limitée** (droits vérifiés avant émission).
- Secrets côté serveur / gestionnaire de secrets Dokploy - **jamais dans le dépôt**.

## 11. Mode démo

Variables d'env dédiées (voir `.env.example`) :

| Variable | Rôle |
|---|---|
| `DEMO_MODE=true` | Bannière + identifiants de démo sur `/login`, bandeau dans le shell app. |
| `AI_DAILY_BUDGET_USD` | Plafond de dépense IA (Mistral) par jour UTC, ex. `0.30`. Absent = pas de plafond. Voir `src/lib/ai-budget.ts` (table `AiUsageDay`). |
| `MISTRAL_INPUT_PRICE_PER_MTOK_USD` / `MISTRAL_OUTPUT_PRICE_PER_MTOK_USD` | Tarifs $/M tokens utilisés pour l'estimation de coût (défauts mistral-medium-3.5, juillet 2026 - à ajuster selon le contrat réel). |

**Réinitialisation au seed de base** : `npm run db:reset-demo` (= `prisma/reset-demo.ts` puis
`prisma/seed.ts`) supprime le projet `RKN` (cascade : tickets, sprints, labels, commentaires,
pièces jointes, wiki) et le recrée avec le jeu de démo (14 tickets couvrant types/priorités/
colonnes/sprints/assignations, commentaires, 2 pages wiki, une colonne avec WIP limit). Les
comptes (`admin@rakoon.io`, `rapporteur@rakoon.io`, `bot@rakoon.io`) sont conservés (upsert).

```bash
docker run --rm --network dokploy-network --env-file rtr.env artemis:latest npm run db:reset-demo
```

Une **tâche cron** (crontab de l'utilisateur `almalinux` sur le serveur) relance cette commande
chaque nuit à **03:00 UTC**, journalisée dans `/opt/deploys/artemis/reset-demo.log` :

```
0 3 * * * /usr/bin/sudo /usr/bin/docker run --rm --network dokploy-network \
  --env-file /opt/deploys/artemis/rtr.env artemis:latest npm run db:reset-demo \
  >> /opt/deploys/artemis/reset-demo.log 2>&1
```

`/opt/deploys/artemis/rtr.env` est la copie de référence de l'env de prod (utilisée par le cron ET
pour les rebuilds manuels) ; `/opt/deploys/artemis/` contient aussi la dernière source déployée
(sync via `rsync`, pas de dépôt Git sur le serveur).

**État actuel (⚠️ secrets - ne pas committer)** :
- **URL** : https://artemis.apps.rakoon.io
- **Admin** : `admin@rakoon.io` / `***MOT-DE-PASSE-RETIRE***` ; **Rapporteur** : `rapporteur@rakoon.io` / `***MOT-DE-PASSE-RETIRE***`
- **IA (Mistral)** : `AI_DAILY_BUDGET_USD=0.30` configuré, mais `MISTRAL_API_KEY` **non fournie** -
  fonctionnalité de génération de tickets par IA désactivée proprement jusqu'à l'ajout d'une clé
  dans `/opt/deploys/artemis/rtr.env` (le plafond s'appliquera automatiquement dès son ajout).
