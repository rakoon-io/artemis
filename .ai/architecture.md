# 🏗️ Architecture — Rakoon Tracker

> Référence technique **canonique** : stack, structure des fichiers, **modèle de données**, patterns
> et conventions. Le modèle de données défini ici fait autorité ; les autres documents le résument
> et pointent vers lui. Les décisions structurantes sont tracées dans `decisions/` (ADR).

---

## Vue d'ensemble

Rakoon Tracker est un **monolithe full-stack TypeScript** bâti sur **Next.js (App Router)**. Le même
projet sert le rendu (React Server/Client Components), l'API (Route Handlers + Server Actions) et la
logique métier (services), avec **Prisma** pour l'accès à **PostgreSQL** et un **stockage
S3-compatible** pour les pièces jointes.

Ce choix privilégie la **cohésion**, la **type-safety de bout en bout** et une **DX élevée**
(voir [`decisions/0001-stack-nextjs-typescript.md`](./decisions/0001-stack-nextjs-typescript.md)).

## Schéma des couches

```
┌────────────────────────────────────────────────────────────┐
│                          Navigateur                          │
│      React (Server & Client Components) · shadcn/ui          │
│           dnd-kit (Kanban) · TanStack Query                  │
└────────────────────────────┬───────────────────────────────┘
                             │ HTTP (RSC / fetch)
┌────────────────────────────▼───────────────────────────────┐
│                    Next.js (App Router)                      │
│   Route Handlers  ·  Server Actions  ·  Auth.js (session)    │
└────────────────────────────┬───────────────────────────────┘
                             │ appels typés
┌────────────────────────────▼───────────────────────────────┐
│         Couche métier — services + policies (RBAC)           │
│                validation Zod à la frontière                 │
└──────────┬──────────────────────────────────┬──────────────┘
           │ Prisma                             │ SDK S3
┌──────────▼───────────┐            ┌───────────▼─────────────┐
│      PostgreSQL       │            │  Stockage S3-compatible │
│  (tickets, sprints…)  │            │    (pièces jointes)     │
└──────────────────────┘            └─────────────────────────┘
```

## Stack détaillée

| Domaine | Technologie | Rôle |
|---------|-------------|------|
| Langage | **TypeScript** (mode strict) | typage bout en bout |
| Framework | **Next.js** (App Router) + React | rendu + API + routing |
| UI | **Tailwind CSS** + **shadcn/ui** (Radix) | design sobre, moderne, thémable, accessible |
| Drag & drop | **dnd-kit** | Kanban accessible (clavier inclus) |
| État serveur | **TanStack Query** | cache & synchronisation des données |
| État UI local | **Zustand** (au besoin) | état d'interface transitoire |
| API | **Route Handlers** + **Server Actions** | endpoints & mutations typés |
| Validation | **Zod** | schémas partagés client/serveur |
| ORM | **Prisma** | accès DB typé + migrations |
| Base de données | **PostgreSQL** (SQLite possible en dev) | persistance |
| Auth | **Auth.js** (NextAuth) | sessions + RBAC |
| Stockage fichiers | **S3-compatible** (MinIO en local) | pièces jointes via URL presignée |
| Tests | **Vitest** (unit) + **Playwright** (e2e) | validation automatisée |
| Qualité | **ESLint** + **Prettier** + **tsc** | lint / format / typecheck |
| Déploiement | **Dokploy** (Docker) sur `apps.rakoon.io` | Traefik + Let's Encrypt (voir ADR-0005) |

## Structure des dossiers (cible)

> ℹ️ Cette structure est **désormais en place** (`src/`, `prisma/`… existent à la racine) ; l'arbre
> ci-dessous en donne la carte de référence.

```
rakoon-tracker/
├── .ai/                     # Memory Bank (docs qui pilotent l'agent)
├── prisma/
│   └── schema.prisma        # modèle de données (source de vérité runtime)
├── public/
├── src/
│   ├── app/                 # routes App Router (pages + api/*)
│   │   ├── (auth)/          # écrans d'authentification
│   │   ├── (app)/           # espace connecté
│   │   │   ├── projects/
│   │   │   ├── board/       # vue Kanban
│   │   │   └── tickets/     # vue liste + détail
│   │   └── api/             # Route Handlers (REST-like)
│   ├── components/
│   │   ├── ui/              # primitives shadcn/ui
│   │   └── features/        # composants métier (kanban, ticket, sprint…)
│   ├── server/
│   │   ├── services/        # logique métier
│   │   ├── policies/        # RBAC (autorisations)
│   │   └── actions/         # server actions
│   ├── lib/
│   │   ├── db.ts            # client Prisma
│   │   ├── auth.ts          # config Auth.js
│   │   ├── storage.ts       # client S3/MinIO
│   │   ├── env.ts           # validation des variables d'env (Zod)
│   │   └── validators/      # schémas Zod partagés
│   ├── types/
│   └── styles/
└── tests/
    ├── unit/
    └── e2e/
```

## Modèle de données (canonique)

Extrait du modèle **Prisma** servant de référence ; le fichier réel
[`prisma/schema.prisma`](../prisma/schema.prisma) fait foi (relations inverses, index et `onDelete`
complets).

```prisma
enum Role        { ADMIN REPORTER }
enum SprintState { PLANNED ACTIVE COMPLETED }
// Types & priorités de tickets ne sont PLUS des enums : ce sont des tables
// par projet (modèles TicketType / TicketPriority ci-dessous).

model User {
  id           String    @id @default(cuid())
  email        String    @unique
  name         String?
  passwordHash String?                       // null si SSO/OAuth
  role         Role      @default(REPORTER)
  createdAt    DateTime  @default(now())
  reported     Ticket[]  @relation("reporter")
  assigned     Ticket[]  @relation("assignee")
  comments     Comment[]
}

model Project {
  id               String           @id @default(cuid())
  key              String           @unique         // ex : "RKN"
  name             String
  description      String?
  accentColor      String?                          // couleur d'accent perso (hex), null = charte par défaut
  ticketSeq        Int              @default(0)      // séquence pour générer les clés RKN-<n>
  createdAt        DateTime         @default(now())
  columns          Column[]
  tickets          Ticket[]
  sprints          Sprint[]
  labels           Label[]
  ticketTypes      TicketType[]
  ticketPriorities TicketPriority[]
}

model Column {                               // colonne Kanban = statut configurable
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  name      String
  order     Int                              // position dans le tableau
  wipLimit  Int?                             // limite d'en-cours optionnelle
  tickets   Ticket[]
}

model TicketType {                           // type de ticket — configurable par projet
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  name      String                           // ex : "Bug", "Fonctionnalité", "Tâche"…
  color     String                           // hex, ex : "#6366F1"
  order     Int                              // position d'affichage
  tickets   Ticket[]
  @@unique([projectId, name])
}

model TicketPriority {                        // priorité de ticket — configurable par projet
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id])
  name      String                           // ex : "Basse", "Moyenne", "Haute", "Urgente"
  color     String                           // hex
  order     Int
  tickets   Ticket[]
  @@unique([projectId, name])
}

model Ticket {
  id          String       @id @default(cuid())
  projectId   String
  project     Project      @relation(fields: [projectId], references: [id])
  number      Int                             // séquentiel par projet (via Project.ticketSeq)
  key         String                          // dénormalisé, ex : "RKN-123"
  title       String
  description String?
  typeId      String
  type        TicketType     @relation(fields: [typeId], references: [id])
  priorityId  String
  priority    TicketPriority @relation(fields: [priorityId], references: [id])
  columnId    String
  column      Column       @relation(fields: [columnId], references: [id])
  rank        String                          // ordre dans la colonne (lexorank)
  reporterId  String
  reporter    User         @relation("reporter", fields: [reporterId], references: [id])
  assigneeId  String?
  assignee    User?        @relation("assignee", fields: [assigneeId], references: [id])
  sprintId    String?
  sprint      Sprint?      @relation(fields: [sprintId], references: [id])
  labels      LabelOnTicket[]
  attachments Attachment[]
  comments    Comment[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  @@unique([projectId, number])
}

model Sprint {                                // « lot » / itération agile
  id        String      @id @default(cuid())
  projectId String
  project   Project     @relation(fields: [projectId], references: [id])
  name      String
  goal      String?
  state     SprintState @default(PLANNED)
  startDate DateTime?
  endDate   DateTime?
  tickets   Ticket[]
}

model Label {
  id        String          @id @default(cuid())
  projectId String
  project   Project         @relation(fields: [projectId], references: [id])
  name      String
  color     String                            // hex, ex : "#7C3AED"
  tickets   LabelOnTicket[]
}

model LabelOnTicket {                          // table de jointure n-n
  ticketId String
  labelId  String
  ticket   Ticket @relation(fields: [ticketId], references: [id])
  label    Label  @relation(fields: [labelId], references: [id])
  @@id([ticketId, labelId])
}

model Attachment {
  id           String   @id @default(cuid())
  ticketId     String
  ticket       Ticket   @relation(fields: [ticketId], references: [id])
  filename     String
  contentType  String                          // image/png, text/plain…
  size         Int
  storageKey   String                          // clé objet dans le stockage S3
  uploadedById String
  createdAt    DateTime @default(now())
}

model Comment {
  id        String   @id @default(cuid())
  ticketId  String
  ticket    Ticket   @relation(fields: [ticketId], references: [id])
  authorId  String
  author    User     @relation(fields: [authorId], references: [id])
  body      String
  createdAt DateTime @default(now())
}
```

> ℹ️ **Notes de modélisation (v1).** La relation `Attachment.uploadedBy → User` est en place dans le
> schéma réel. **Aucune appartenance par projet** (`ProjectMember`) n'est modélisée en v1 : la
> visibilité est **à l'échelle de l'organisation** (organisation unique, inscription restreinte par
> domaine — cf. correctif de sécurité **C1**), `ProjectMember` restant une **évolution future** (voir
> [`context.md`](./context.md)).

## Patterns clés

- **Flux de données** : UI → Server Action / Route Handler → **service** → Prisma → DB. Le résultat
  remonte typé. Aucune requête Prisma directement dans un composant.
- **Validation** : un **schéma Zod** valide toute entrée à la frontière (formulaire, API). Les
  schémas sont partagés client/serveur (`lib/validators`).
- **Autorisation (RBAC)** : des **policies** centralisées (`server/policies`) répondent à
  `peut(user, action, ressource)`. Aucune vérification de droit dispersée dans l'UI (l'UI masque,
  le serveur **impose**). Voir [`decisions/0003-rbac-admin-rapporteur.md`](./decisions/0003-rbac-admin-rapporteur.md).
- **Pièces jointes (paste-first)** : le client capture le presse-papier (image/texte/log), demande
  une **URL presignée** (le serveur vérifie les droits), téléverse directement vers le stockage,
  puis enregistre l'`Attachment`. Voir [`decisions/0004-pieces-jointes-paste-first.md`](./decisions/0004-pieces-jointes-paste-first.md).
- **Ordre Kanban** : chaque ticket porte un `rank` lexicographique (**lexorank**) permettant de
  réordonner une carte sans renuméroter toute la colonne.
- **Clé de ticket** : numéro **séquentiel par projet** (`Project.ticketSeq` → `Ticket.number`), avec
  une clé lisible **dénormalisée** `key` (`RKN-1`, `RKN-2`, …) ; unicité garantie par `(projectId, number)`.
- **Workflow personnalisable** : les statuts sont des **`Column` en base** (par projet), pas des
  valeurs codées en dur. Voir [`decisions/0002-workflow-kanban-personnalisable.md`](./decisions/0002-workflow-kanban-personnalisable.md).
- **Personnalisation par projet** : **types, priorités, colonnes, labels et couleur d'accent** sont
  **configurables par projet** (données en base, pas de valeurs codées en dur) ; les jeux par défaut
  sont posés au **seed** et gérés ensuite via les **Paramètres** (Admin). Voir
  [`decisions/0006-types-priorites-configurables.md`](./decisions/0006-types-priorites-configurables.md).

## Conventions

- **Nommage** : fichiers en `kebab-case` ; composants React en `PascalCase` ; variables/fonctions en
  `camelCase` ; valeurs d'enum en `SCREAMING_SNAKE_CASE`.
- **Organisation par feature** (`components/features`, `server/services`) plutôt que par type technique.
- **Commits** : [Conventional Commits](https://www.conventionalcommits.org) (`feat:`, `fix:`, `docs:`,
  `refactor:`, `test:`, `chore:`…).
- **Branches** : trunk-based, branches de feature courtes.
- **Env** : variables validées via Zod dans `lib/env.ts` ; **jamais de secret en dur**.
- **TypeScript strict** : pas de `any` implicite (voir [`rules.md`](./rules.md)).
- **Gestionnaire de paquets** : **npm** (`package-lock.json`), aligné sur les autres applis Rakoon.

## Tests & qualité

- **Unit** (Vitest) : services, policies, validators.
- **E2E** (Playwright) : parcours création de ticket, Kanban (drag & drop), sprint.
- **Typecheck** : `tsc --noEmit`. **Lint** : ESLint. **Format** : Prettier.
- **Build** : `npm run build` force `NODE_ENV=production` via **`cross-env`** — évite un souci de
  prerender React quand l'environnement ambiant vaut `development`.
- **CI** (future) : `typecheck` + `lint` + `test` sur chaque PR.

## Évolutions futures (hors v1)

Temps réel (websockets), notifications, intégrations externes, reporting/analytics, multi-tenant,
i18n. Ces axes sont volontairement exclus de la v1 (voir [`vision.md`](./vision.md#-non-objectifs-v1)).
