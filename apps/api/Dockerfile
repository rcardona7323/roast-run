FROM node:20-alpine

# Install pnpm directly via npm (more reliable than corepack in Docker)
RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./

# Copy package.json files for workspace packages
COPY packages/db/package.json ./packages/db/
COPY apps/api/package.json ./apps/api/

# Install all dependencies
RUN pnpm install --ignore-scripts

# Copy all source files
COPY tsconfig.base.json tsconfig.json ./
COPY packages/db ./packages/db
COPY apps/api ./apps/api

# Build
RUN pnpm --filter @runclub/api run build

EXPOSE 8080

CMD ["node", "apps/api/dist/index.js"]
