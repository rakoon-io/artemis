# syntax=docker/dockerfile:1
# Artemis - image de production (voir DEPLOY.md).

# ---- Builder ----
FROM node:20-bookworm AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
COPY package.json package-lock.json .npmrc ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
# Placeholders de build (surchargés au runtime par --env-file).
ENV DATABASE_URL="postgresql://placeholder:placeholder@db:5432/placeholder?schema=public"
ENV AUTH_SECRET="build-placeholder-secret-override-at-runtime"
ENV AUTH_TRUST_HOST=true
ENV NODE_ENV=production
# Identité du code compilé, affichée en pied de page. `.dockerignore` exclut
# `.git` : impossible de la lire ici, il faut la PASSER. Sans ces deux valeurs
# l'image se construit quand même, mais n'affichera que son numéro de version -
# sans dire de quel commit elle sort. Voir DEPLOY.md § 5.3.
ARG ARTEMIS_COMMIT=""
ARG ARTEMIS_COMMIT_DATE=""
ENV ARTEMIS_COMMIT=$ARTEMIS_COMMIT ARTEMIS_COMMIT_DATE=$ARTEMIS_COMMIT_DATE
# Identité de l'instance : teinte l'icône installée, le nom de l'application et
# la pastille de l'en-tête. À passer ici et non au runtime - l'icône est certes
# engendrée par le serveur, mais la teinte doit aussi atteindre le navigateur.
# Sans étiquette, l'image est celle de la production : « Artemis », couleur de
# marque. Voir DEPLOY.md § 5.3.
ARG ARTEMIS_INSTANCE_LABEL=""
ARG ARTEMIS_INSTANCE_COLOR=""
ENV ARTEMIS_INSTANCE_LABEL=$ARTEMIS_INSTANCE_LABEL ARTEMIS_INSTANCE_COLOR=$ARTEMIS_INSTANCE_COLOR
RUN npm run build

# ---- Runner ----
FROM node:20-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/package.json /app/package-lock.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
EXPOSE 3000
# Migrations : lancer `npx prisma migrate deploy` (voir DEPLOY.md §5.5) avant/à côté.
CMD ["npm", "run", "start", "--", "-H", "0.0.0.0", "-p", "3000"]
