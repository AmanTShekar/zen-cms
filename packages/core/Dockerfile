# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy core package
COPY packages/core/package.json ./packages/core/
COPY packages/types/package.json ./packages/types/

# Install dependencies (ignoring scripts to avoid build errors during install)
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/core/ ./packages/core/
COPY packages/types/ ./packages/types/

# Build types then core
RUN pnpm --filter @zenith-open/zenithcms-types run build
RUN pnpm --filter @zenith-open/zenithcms-core run build

# Stage 2: Production Runner
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Create non-root user
RUN addgroup -g 1001 nodejs && \
    adduser -S -u 1001 -G nodejs zenith

# Copy necessary files from builder
COPY --from=builder /app/package.json /app/pnpm-workspace.yaml /app/pnpm-lock.yaml ./
COPY --from=builder /app/packages/core/package.json ./packages/core/
COPY --from=builder /app/packages/core/dist ./packages/core/dist
COPY --from=builder /app/packages/types/package.json ./packages/types/
COPY --from=builder /app/packages/types/dist ./packages/types/dist

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
