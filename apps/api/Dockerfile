FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for all workspace packages
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install dependencies (no --frozen-lockfile so overrides don't conflict)
RUN pnpm install --no-frozen-lockfile

# Copy all source
COPY tsconfig.base.json tsconfig.json ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Build shared db package first, then api
RUN pnpm --filter @runclub/db run build 2>/dev/null || true
RUN pnpm --filter @runclub/api run build

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
