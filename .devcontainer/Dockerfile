FROM mcr.microsoft.com/devcontainers/javascript-node:1-20-bullseye

# Install additional utility tools and system packages
RUN apt-get update && export DEBIAN_FRONTEND=noninteractive \
    && apt-get -y install --no-install-recommends postgresql-client gnupg wget \
    # Install MongoDB Database Tools
    && wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | gpg --dearmor -o /usr/share/keyrings/mongodb-archive-keyring.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/mongodb-archive-keyring.gpg] http://repo.mongodb.org/apt/debian bullseye/mongodb-org/7.0 main" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list \
    && apt-get update && apt-get install -y mongodb-mongosh \
    && apt-get clean -y && rm -rf /var/lib/apt/lists/*

# Install pnpm globally for rapid dependency management
RUN npm install -g pnpm
