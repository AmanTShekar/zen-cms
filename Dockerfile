# syntax=docker/dockerfile:1.4

ARG NODE_VERSION=20

####################################################################################################
## Stage 1: Build

FROM node:${NODE_VERSION}-alpine AS builder

RUN npm install -g corepack@latest
RUN apk --no-cache add python3 py3-setuptools build-base

WORKDIR /zenith

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN corepack enable && corepack prepare pnpm@latest --activate
RUN pnpm fetch --frozen-lockfile

COPY . .
RUN pnpm install --recursive --offline --frozen-lockfile
RUN pnpm run build

####################################################################################################
## Stage 2: Production Image

FROM node:${NODE_VERSION}-alpine AS runtime

RUN npm install -g pm2 corepack@latest

WORKDIR /zenith

ENV NODE_ENV="production"
ENV PORT=3000

# Copy only what we need
COPY --from=builder /zenith/node_modules ./node_modules
COPY --from=builder /zenith/packages ./packages
COPY --from=builder /zenith/cms.config.ts ./
COPY --from=builder /zenith/.env.example ./.env.example
COPY --from=builder /zenith/server.ts ./

# Create media and uploads dirs and ensure the 'node' user owns the workspace
RUN mkdir -p media uploads && chown -R node:node /zenith

# Run as non-root user
USER node

EXPOSE 3000

# Run the correct path in the monorepo after TypeScript compilation
CMD ["pm2-runtime", "start", "packages/core/dist/packages/core/src/server.js", "--name", "zenith-cms"]
