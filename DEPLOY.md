# Déploiement - Rakoon Tracker

> Déploiement **« comme les autres applis Rakoon »** : serveur **OVH + Dokploy**, reverse-proxy
> **Traefik** sur le wildcard **`*.apps.rakoon.io`**. Décision tracée dans
> [`ADR-0005`](./.ai/decisions/0005-deploiement-dokploy-ovh.md).
>
> ℹ️ **L'application v1 est implémentée** (Next.js, **npm**) : `package.json` + `package-lock.json`,
> `src/`, `prisma/` (schéma + migration) et un **`Dockerfile` multi-stage** sont à la racine. Le
> déploiement reste à réaliser - bloqué sur l'**accès serveur / Dokploy** (voir
> [`.ai/context.md`](./.ai/context.md)).

Vue produit → [`README.md`](./README.md) · architecture & modèle de données →
[`.ai/architecture.md`](./.ai/architecture.md).

## 1. Cible & modèle

- **Sous-domaine** : **`tracker.apps.rakoon.io`** *(proposé - à confirmer ; ex. `rakoon-tasker` = `spark.apps.rakoon.io`)*.
- **Reverse-proxy** : Traefik de Dokploy (`web` :80 → `websecure` :443, `certResolver: letsencrypt`).
- **Réseau** : overlay Swarm **`dokploy-network`** (résolution des conteneurs par leur nom).

```
Internet ──HTTPS──> Traefik (dokploy-traefik, :80/:443)
                      │  route tracker.apps.rakoon.io  (Let's Encrypt)
                      ▼
        rakoon-tracker (Next.js « next start », :3000)
             ├──► rakoon-tracker-db     (postgres:16)     vol: rakoon-tracker-db-data
             └──► rakoon-tracker-minio  (S3-compatible)   vol: rakoon-tracker-minio-data
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
| `DATABASE_URL` | | Postgres interne (`rakoon-tracker-db:5432`) |
| `AUTH_SECRET` | | Secret Auth.js (`openssl rand -base64 32`) |
| `AUTH_URL` | | `https://tracker.apps.rakoon.io` |
| `AUTH_TRUST_HOST` | | `true` (derrière le proxy Traefik) |
| `S3_ENDPOINT` | | Endpoint stockage pièces jointes (`http://rakoon-tracker-minio:9000`) |
| `S3_BUCKET` | | Bucket des pièces jointes (`rakoon-tracker-attachments`) |
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
docker run -d --name rakoon-tracker-db --restart unless-stopped \
  --network dokploy-network \
  -e POSTGRES_USER=tracker -e POSTGRES_PASSWORD="$DBPW" -e POSTGRES_DB=tracker \
  -v rakoon-tracker-db-data:/var/lib/postgresql/data \
  postgres:16
# DATABASE_URL = postgresql://tracker:$DBPW@rakoon-tracker-db:5432/tracker?schema=public
```

### 5.2 - Stockage S3-compatible (MinIO) pour les pièces jointes
```bash
MINIO_PW=$(openssl rand -hex 20)
docker run -d --name rakoon-tracker-minio --restart unless-stopped \
  --network dokploy-network \
  -e MINIO_ROOT_USER=tracker -e MINIO_ROOT_PASSWORD="$MINIO_PW" \
  -v rakoon-tracker-minio-data:/data \
  minio/minio server /data --console-address ":9001"
# Puis créer le bucket "rakoon-tracker-attachments" (via `mc`, ou au démarrage de l'app).
```

### 5.3 - Build de l'image (contexte = source du repo + Dockerfile)
```bash
docker build -t rakoon-tracker:latest /chemin/vers/le/contexte
```

### 5.4 - Fichier d'environnement `rtr.env`
```ini
NODE_ENV=production
DATABASE_URL=postgresql://tracker:<DBPW>@rakoon-tracker-db:5432/tracker?schema=public
AUTH_SECRET=<openssl rand -base64 32>
AUTH_URL=https://tracker.apps.rakoon.io
AUTH_TRUST_HOST=true
S3_ENDPOINT=http://rakoon-tracker-minio:9000
S3_BUCKET=rakoon-tracker-attachments
S3_ACCESS_KEY_ID=tracker
S3_SECRET_ACCESS_KEY=<MINIO_PW>
S3_REGION=us-east-1
```

### 5.5 - Migrations Prisma
```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  rakoon-tracker:latest npx prisma migrate deploy
```

### 5.6 - Lancement du conteneur applicatif
```bash
docker rm -f rakoon-tracker 2>/dev/null
docker run -d --name rakoon-tracker --restart unless-stopped \
  --network dokploy-network --env-file rtr.env \
  rakoon-tracker:latest
```

### 5.7 - Route Traefik (HTTPS auto)
Fichier **`/etc/dokploy/traefik/dynamic/tracker.yml`** (rechargé à chaud) :
```yaml
http:
  routers:
    tracker-secure:
      rule: Host(`tracker.apps.rakoon.io`)
      entryPoints: [websecure]
      service: tracker
      tls:
        certResolver: letsencrypt
    tracker-web:
      rule: Host(`tracker.apps.rakoon.io`)
      entryPoints: [web]
      middlewares: [redirect-to-https]
      service: tracker
  services:
    tracker:
      loadBalancer:
        servers:
          - url: http://rakoon-tracker:3000
```
Traefik obtient alors automatiquement le certificat Let's Encrypt (HTTP-01).

### 5.8 - Compte admin initial
Un **script de seed** (`npm run db:seed`, ou `npx prisma db seed`) crée les comptes de démo (Admin +
Rapporteur). En production, l'exécuter une fois via un conteneur jetable (comme en 5.5) **puis
changer les mots de passe** :
```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  rakoon-tracker:latest npm run db:seed
```

## 6. Mise à jour / redéploiement
```bash
docker build -t rakoon-tracker:latest <contexte>
# si le schéma Prisma a changé : rejouer 5.5 (migrate deploy)
docker rm -f rakoon-tracker
docker run -d --name rakoon-tracker --restart unless-stopped \
  --network dokploy-network --env-file rtr.env rakoon-tracker:latest
```
La route Traefik, la base et le stockage ne bougent pas (volumes persistants).

## 7. Option Dokploy-managed (auto-deploy sur `git push`)
1. Générer un **token API Dokploy** (Settings → API).
2. Connecter GitHub à Dokploy (App GitHub ou deploy key) sur **`rakoon-io/rakoon-tracker`**.
3. Créer l'application Dokploy (source Git), y reporter les variables du §3, rattacher Postgres + MinIO.
4. Chaque `git push` sur la branche de déploiement déclenche alors build + déploiement automatiques.

## 8. Vérifications post-déploiement
- **Healthcheck** : l'application répond `200` (endpoint de santé à prévoir).
- **Smoke test** : connexion → création d'un ticket avec **image collée** → déplacement d'une carte
  en Kanban → filtre en vue liste.
- **TLS** : certificat Let's Encrypt actif sur `https://tracker.apps.rakoon.io`.

## 9. Rollback
Redéployer l'image précédente (`rakoon-tracker:<tag-précédent>`) ; si le schéma a changé, restaurer
la base (volume `rakoon-tracker-db-data` / sauvegarde). Documenter la procédure exacte une fois la
CI/CD en place.

## 10. Sécurité & secrets
- `.env*` et `rtr.env` **jamais commités** (gitignore).
- Pièces jointes servies via **URLs presignées à durée limitée** (droits vérifiés avant émission).
- Secrets côté serveur / gestionnaire de secrets Dokploy - **jamais dans le dépôt**.
