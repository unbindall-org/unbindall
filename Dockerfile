# syntax=docker/dockerfile:1

FROM node:26-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV NEXT_TELEMETRY_DISABLED=1

RUN apk add --no-cache libc6-compat \
  && corepack enable \
  && corepack prepare pnpm@11.15.0 --activate

FROM base AS dependencies
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
WORKDIR /app

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .

# Next evaluates the server modules while producing the build. These values are
# build-only placeholders and are not inherited by the runtime image.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build"
ENV AUTH_SECRET="build-only-secret-at-least-32-characters"
ENV AUTH_URL="https://build.example.com"
ENV AUTH_EXPECTED_HOST="build.example.com"
ENV AUTH_TRUST_HOST="false"
ENV REDIS_URL="redis://localhost:6379"

RUN mkdir -p public \
  && pnpm build

FROM dependencies AS migrator
WORKDIR /app

COPY drizzle.config.ts tsconfig.json ./
COPY drizzle ./drizzle
COPY src/db ./src/db

CMD ["pnpm", "db:migrate"]

FROM node:26-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 --ingroup nodejs nextjs

COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + process.env.PORT + '/api/health').then((response) => { if (!response.ok) process.exit(1) }).catch(() => process.exit(1))"

CMD ["node", "server.js"]
