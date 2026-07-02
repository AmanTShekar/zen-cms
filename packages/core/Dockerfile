# Stage 1: Build
FROM node:20-alpine AS builder
ARG PNPM_VERSION=9.15.9

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Copy root workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY tsconfig.json ./

# Fetch dependencies using only the lockfile for better layer caching
RUN pnpm fetch --frozen-lockfile

# Copy the entire workspace
COPY . .

# Install dependencies offline
RUN pnpm install --frozen-lockfile --offline --ignore-scripts

# Build dependencies then core
RUN pnpm --filter @zenith-open/zenithcms-types run build
RUN pnpm --filter @zenith-open/zenithcms-db-mongodb run build
RUN pnpm --filter @zenith-open/zenithcms-db-postgres run build
RUN pnpm --filter @zenith-open/zenithcms-core run build

# Prepare production artifacts dynamically to avoid hardcoded paths
RUN mkdir -p /app/prod-packages && \
    cd /app/packages && \
    find . -maxdepth 2 -name package.json -exec cp --parents {} /app/prod-packages/ \; && \
    find . -maxdepth 3 -type d -name dist -exec cp -r --parents {} /app/prod-packages/ \;

# Stage 2: Production Runner
FROM node:20-alpine AS runner
ARG PNPM_VERSION=9.15.9

WORKDIR /app

ENV NODE_ENV=production

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@${PNPM_VERSION} --activate

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs zenith

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/prod-packages/ ./packages/

# Install only production dependencies
RUN pnpm install --prod --frozen-lockfile --ignore-scripts

# Create necessary directories and set permissions
RUN mkdir -p /app/packages/core/config/blocks && \
    mkdir -p /app/packages/core/uploads && \
    chown -R zenith:nodejs /app

USER zenith

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -qO- http://localhost:3000/live || exit 1

WORKDIR /app/packages/core

CMD ["node", "dist/server.js"]
