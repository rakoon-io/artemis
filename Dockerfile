# syntax=docker/dockerfile:1
# Artemis - image de production (voir DEPLOY.md).

# ---- Builder ----
FROM node:20-bookworm AS builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 HUSKY=0
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npx prisma generate
# Placeholders de build (surchargés au runtime par --env-file).
ENV DATABASE_URL="postgresql://placeholder:placeholder@db:5432/placeholder?schema=public"
ENV AUTH_SECRET="build-placeholder-secret-override-at-runtime"
ENV AUTH_TRUST_HOST=true
ENV NODE_ENV=production
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
