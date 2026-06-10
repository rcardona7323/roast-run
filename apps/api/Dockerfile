FROM node:22-alpine

RUN npm install -g pnpm@9

WORKDIR /app

# Copy workspace config from repo root
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

# Build the API
RUN cd apps/api && npx tsc --outDir dist --noEmit false

EXPOSE 8080

CMD ["node", "/app/apps/api/dist/index.js"]
