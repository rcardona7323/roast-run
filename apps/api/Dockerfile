FROM node:20-alpine AS base
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Install dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json tsconfig.json ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Build
RUN pnpm --filter @runclub/db run build 2>/dev/null || true
RUN pnpm --filter @runclub/api run build

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
