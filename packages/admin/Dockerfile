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
    add_header X-Frame-Options "SAMEORIGIN" always; \
    add_header X-Content-Type-Options "nosniff" always; \
    add_header X-XSS-Protection "1; mode=block" always; \
    add_header Referrer-Policy "strict-origin-when-cross-origin" always; \
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always; \
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
