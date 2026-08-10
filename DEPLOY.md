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
             └──► artemis-minio  (S3-compatible)   vol: artemis-minio-data   [option, cf. §3.1]
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
| `LOCAL_UPLOAD_DIR` | | Répertoire des pièces jointes sur un **volume monté** (ex. `/data/uploads`) |
| `S3_ENDPOINT` | | Endpoint stockage objet (`http://artemis-minio:9000`) |
| `S3_BUCKET` | | Bucket des pièces jointes (`artemis-attachments`) |
| `S3_ACCESS_KEY_ID` | | Clé d'accès au stockage objet |
| `S3_SECRET_ACCESS_KEY` | | Clé secrète du stockage objet |
| `S3_REGION` | | Région du bucket (`us-east-1` par défaut, même avec MinIO) |

### 3.1 - Deux stockages possibles pour les pièces jointes

Dans les deux cas, **les octets transitent par l'application** : le navigateur ne
joint jamais le stockage, qui n'a donc pas à être exposé.

| Mode | Quand | Configuration |
|---|---|---|
| **Disque** | Déploiement autocontenu : un seul service, un seul volume | `LOCAL_UPLOAD_DIR` vers un volume monté, et **aucune** variable `S3_*` |
| **Objet** | Stockage partagé, ou plusieurs instances de l'application | les cinq variables `S3_*` |

Les variables `S3_*` l'emportent dès qu'elles sont présentes.

> ⚠️ Le mode disque **exige `LOCAL_UPLOAD_DIR`** en production. Sans lui, l'écriture
> est refusée plutôt que d'atterrir dans un conteneur sans volume, où les fichiers
> disparaîtraient au déploiement suivant, sans erreur. Le mode disque n'admet
> qu'**une seule instance** : un répertoire local ne se partage pas.

### 3.2 - Passer d'un stockage à l'autre

Les deux stockages doivent être configurés **pendant** la copie ; on ne retire les
variables de celui que l'on abandonne qu'ensuite, une fois le résultat vérifié.

```bash
npm run storage:migrate -- --to=local           # simulation
npm run storage:migrate -- --to=local --write   # copie réellement
```

Le script parcourt les lignes `Attachment` et `WikiAttachment`, pas le contenu du
stockage : un objet orphelin n'est pas recopié, une ligne sans objet est signalée.
Il est idempotent et **ne supprime jamais la source** : tant qu'elle est intacte,
le retour arrière ne coûte rien.

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

### 5.2 - Stockage S3-compatible (MinIO) pour les pièces jointes, en option

> Inutile en mode disque (cf. §3.1) : monter un volume sur l'application suffit.

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
docker build \
  --build-arg ARTEMIS_COMMIT="$(git rev-parse HEAD)" \
  --build-arg ARTEMIS_COMMIT_DATE="$(git log -1 --format=%cI)" \
  -t artemis:latest /chemin/vers/le/contexte
```

> **Les deux `--build-arg` ne sont pas décoratifs.** Le pied de page affiche
> `v<version>+<empreinte> · <date du commit>` — la première question de tout
> signalement. Ces valeurs sont lues dans le dépôt **au moment du build**, or
> `.dockerignore` exclut `.git` : sans elles, l'image ne saura dire que son
> numéro de version, jamais de quel commit elle sort. Le build ne échoue pas
> pour autant (cf. `src/lib/build-info.ts`).
>
> À exécuter **depuis le dépôt** : les deux commandes `git` s'évaluent sur votre
> machine, pas dans le conteneur. En CI, les variables de la forge conviennent
> telles quelles (`GITHUB_SHA`, `CI_COMMIT_SHA`, `CI_COMMIT_TIMESTAMP`…).

#### Plusieurs déploiements : les distinguer

Chaque origine est déjà une **installation séparée** pour le navigateur. Le
problème est visuel : trois icônes identiques dans le dock, trois fenêtres
identiques, et plus de barre d'adresse pour trancher — c'est précisément ce que
le mode autonome retire. Deux arguments supplémentaires y répondent :

```bash
docker build \
  --build-arg ARTEMIS_INSTANCE_LABEL="Recette" \
  --build-arg ARTEMIS_INSTANCE_COLOR="#c2410c" \
  … -t artemis:recette <contexte>
```

Ils teintent l'**icône engendrée** (fond coloré + étiquette peinte dessus), le
**nom de l'application installée** (« Artemis · Recette ») et une **pastille**
à côté de la marque, dans l'en-tête comme sur l'écran de connexion.

- **La production ne se déclare pas.** Sans étiquette, l'application est
  « Artemis » dans sa couleur de marque. Ce sont les autres qui se signalent :
  l'inverse conduirait à oublier d'étiqueter le seul endroit où l'oubli coûte.
- Étiquette **courte** — tronquée à 12 caractères, elle est peinte sur une icône
  de 192 pixels.
- Couleur **hexadécimale** (`#rgb` ou `#rrggbb`) ; toute autre valeur est
  ignorée au profit de la couleur de marque, plutôt que d'invalider le manifeste.
- Ces arguments ne sont qu'un **point de départ** : ils valent dès le premier
  démarrage, avant qu'un administrateur ait pu se connecter. Ensuite, la page
  **« Cette instance »** (menu utilisateur, réservée aux administrateurs) les
  surcharge à chaud — sans reconstruire ni redémarrer. Vider un champ dans cette
  page rend la main à la valeur passée ici.

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

#### Si `..._canonical_emails` s'interrompt

Cette migration met les adresses e-mail en minuscules, parce que la casse en
faisait des identites distinctes : `Admin@x.io` et `admin@x.io` etaient deux
comptes, et le titulaire qui tapait son adresse avec une capitale ne se
connectait plus. Elle **s'arrete plutot que de choisir a votre place** si deux
comptes se confondent une fois abaisses :

```
Migration interrompue : ces adresses designent plusieurs comptes une fois mises
en minuscules (admin@x.io). Fusionnez ou renommez ces comptes, puis relancez.
```

Rien n'a ete modifie : la transaction est annulee. Listez les comptes en cause,

```sql
SELECT id, email, name, role, "createdAt" FROM "User"
 WHERE lower(email) IN (SELECT lower(email) FROM "User"
                        GROUP BY lower(email) HAVING count(*) > 1)
 ORDER BY lower(email), "createdAt";
```

puis tranchez a la main - le plus ancien est en general le vrai titulaire.
Reattribuez ses tickets et ses appartenances avant de supprimer l'autre, la
suppression d'un compte emportant ce qui en depend. Relancez ensuite
`migrate deploy`.

Reprise ponctuelle des donnees derivees du wiki : URL lisible
(`?page=guide-du-projet`) et texte de recherche (sans accents) des pages creees
avant ces fonctionnalites. A jouer apres les migrations `..._add_wiki_slug` et
`..._add_wiki_search`. Le script est idempotent, on peut le rejouer sans risque.

```bash
docker run --rm --network dokploy-network --env-file rtr.env \
  artemis:latest npm run db:backfill-wiki
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
docker build \
  --build-arg ARTEMIS_COMMIT="$(git rev-parse HEAD)" \
  --build-arg ARTEMIS_COMMIT_DATE="$(git log -1 --format=%cI)" \
  -t artemis:latest <contexte>
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
- Pièces jointes **déposées et servies par l'application**, jamais par le stockage : droits vérifiés
  à chaque appel, et MinIO n'a pas à être joignable depuis Internet (`S3_ENDPOINT` reste un nom du
  réseau interne).
- Secrets côté serveur / gestionnaire de secrets Dokploy - **jamais dans le dépôt**.

### Politique de sécurité du contenu

Le middleware tire un **jeton par requête** et l'inscrit dans `script-src`
(`src/lib/csp.ts`). C'est ce qui permet de se passer d'`unsafe-inline` : sans
lui, la directive autorisait aussi le script qu'un attaquant serait parvenu à
écrire dans la page.

Deux conséquences pour l'exploitation :

- **rien à configurer**, mais ne placez devant l'application aucun relais qui
  réécrive le HTML (injection de bandeau, minification à la volée). Un script
  ajouté après coup n'aura pas le jeton, et le navigateur le refusera ;
- un second en-tête part **en observation** (`...-Report-Only`), d'un cran plus
  strict : styles en ligne et images de tiers. Mesuré au navigateur sur neuf
  pages authentifiées : **0 refus imposé**, 287 signalements en observation
  (269 attributs `style`, 18 éléments `<style>`). Ces signalements sont normaux
  et n'indiquent aucune panne ; ils chiffrent ce que coûterait la fermeture de
  ces deux portes.

Vérifier après un déploiement :

```bash
curl -sD - -o /dev/null https://<domaine>/login | grep -i content-security-policy
# script-src 'self' 'nonce-…'   ← un jeton, et pas de 'unsafe-inline'
```

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

**État actuel** :
- **URL** : https://artemis.apps.rakoon.io
- **Comptes** : les identifiants ne figurent PAS ici. Ce fichier est versionné dans
  un dépôt public ; l'avertissement « ne pas committer » qui coiffait cette
  section ne l'a pas empêché, et les mots de passe d'amorçage y sont restés
  lisibles de tous. Ils vivent dans `/opt/deploys/artemis/rtr.env` sur le
  serveur, et nulle part ailleurs.
  Rotation : `npm run db:rotate-passwords`.
- **IA (Mistral)** : `AI_DAILY_BUDGET_USD=0.30` configuré, mais `MISTRAL_API_KEY` **non fournie** -
  fonctionnalité de génération de tickets par IA désactivée proprement jusqu'à l'ajout d'une clé
  dans `/opt/deploys/artemis/rtr.env` (le plafond s'appliquera automatiquement dès son ajout).
