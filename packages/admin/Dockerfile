# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Enable pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy root workspace config
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.json ./

# Copy all workspace package.json files
COPY packages/admin/package.json ./packages/admin/
COPY packages/cli/package.json ./packages/cli/
COPY packages/core/package.json ./packages/core/
COPY packages/create-zenith-app/package.json ./packages/create-zenith-app/
COPY packages/create-zenithcms-app/package.json ./packages/create-zenithcms-app/
COPY packages/db-mongodb/package.json ./packages/db-mongodb/
COPY packages/db-postgres/package.json ./packages/db-postgres/
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/types/package.json ./packages/types/

# Install dependencies
RUN pnpm install --frozen-lockfile --ignore-scripts

# Copy source code
COPY packages/admin/ ./packages/admin/
COPY packages/types/ ./packages/types/
COPY packages/sdk/ ./packages/sdk/

# Build dependencies then admin
RUN pnpm --filter @zenith-open/zenithcms-types run build
RUN pnpm --filter @zenith-open/zenithcms-sdk run build
RUN pnpm --filter @zenith-open/zenithcms-admin run build

# Stage 2: Serve with Nginx
FROM nginx:alpine AS runner

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Create nginx config
RUN echo 'server { \
    listen 80; \
    server_name localhost; \
    root /usr/share/nginx/html; \
    index index.html; \
    \
    gzip on; \
    gzip_vary on; \
    gzip_proxied any; \
    gzip_comp_level 6; \
    gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml; \
    \
    # SPA fallback \
    location / { \
        try_files $uri $uri/ /index.html; \
        add_header Cache-Control "no-cache"; \
    } \
    \
    # Cache static assets \
    location ~* \.(?:css|js)$ { \
        expires 1y; \
        access_log off; \
        add_header Cache-Control "public, max-age=31536000, immutable"; \
    } \
}' > /etc/nginx/conf.d/admin.conf

# Copy built assets
COPY --from=builder /app/packages/admin/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Run nginx
CMD ["nginx", "-g", "daemon off;"]
