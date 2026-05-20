# Zenith Installation & Deployment Guide

Zenith CMS can be deployed as a unified monolithic system or as a decoupled headless engine. This guide details setup commands for local development, production configuration, and hosting strategies.

---

## 🛠️ Local Development

### 1. Environment Configuration

Create a `.env` file in the root folder of the project. Set database connection details and secret keys:

```env
# SERVER CONFIGURATION
PORT=3000
NODE_ENV=development

# DATABASE ADAPTERS (Uncomment the driver you are using)
# MongoDB Adapter
DATABASE_URI=mongodb://localhost:27017/zenith

# PostgreSQL Adapter
# DATABASE_TYPE=postgres
# DATABASE_URL=postgres://postgres:password@localhost:5432/zenith

# JWT & ACCESS SECURITY KEYS
ZENITH_SECRET=your-super-secret-cryptographic-hash
ADMIN_API_KEY=zenith_dev_key_123

# EXTERNAL MEDIA PROVIDERS (Optional)
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### 2. Install Workspace Dependencies

Zenith is structured as a `pnpm` monorepo. Install all package dependencies from the root directory:

```bash
pnpm install
```

### 3. Run the Development Server

Start the core backend API and the Vite React Admin Dashboard simultaneously:

```bash
pnpm run dev
```

*   **Vite Admin Console**: `http://localhost:5173`
*   **Express API Server**: `http://localhost:3000` (Endpoints mounted under `/api/v1`)

---

## 🚀 Production Deployment Options

Zenith CMS compiles to native JavaScript. Below are the primary deployment strategies used in production:

### Option A: Docker Deployment (Recommended)

Zenith features a multi-stage, optimized `Dockerfile` in the root of the repository. It compiles TypeScript packages and runs the core engine inside a lightweight Alpine Node environment using PM2 process clustering.

1.  **Build the Docker Image**:
    ```bash
    docker build -t zenith-cms .
    ```
2.  **Run the Container**:
    Make sure to pass your production environment variables:
    ```bash
    docker run -d \
      -p 3000:3000 \
      --env-file .env \
      --name zenith-instance \
      zenith-cms
    ```

### Option B: Self-Hosted PM2 (VPS / Linux VM)

If deploying to a virtual private server (like DigitalOcean, AWS EC2, or Linode):

1.  **Install Global Process Managers**:
    ```bash
    npm install -g pm2
    ```
2.  **Build the Project Assets**:
    ```bash
    pnpm run build
    ```
3.  **Launch Backend with PM2**:
    Start the Express server using the compiled distribution path:
    ```bash
    pm2 start packages/core/dist/packages/core/src/server.js --name zenith-cms
    ```
4.  **Configure Nginx Reverse Proxy**:
    Point Nginx incoming traffic to port `3000`. Ensure file upload sizes are adjusted in your virtual host server block:
    ```nginx
    server {
        listen 80;
        server_name cms.yourdomain.com;

        # Allow large file uploads for media libraries
        client_max_body_size 50M;

        location / {
            proxy_pass http://localhost:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
        }
    }
    ```

### Option C: PaaS Deployments (Railway, Render, Fly.io)

You can host Zenith CMS on cloud platforms that support Docker or Node.js runtimes:

*   **Docker Builder**: Connect your GitHub repository to Railway or Render. The platform will automatically detect the root `Dockerfile` and boot the service on port `3000`.
*   **Node.js Build Settings**:
    *   **Build Command**: `pnpm run build`
    *   **Start Command**: `node packages/core/dist/packages/core/src/server.js`
    *   **Environment Variables**: Input `DATABASE_URI` (or `DATABASE_URL`), `ZENITH_SECRET`, and `NODE_ENV=production`.

### Option D: Decoupled Frontend Deployment (Vercel, Netlify, Cloudflare Pages)

Because the Vite Admin UI (`packages/admin`) compile step outputs static HTML, CSS, and JS assets, you can host the dashboard on static CDNs while pointing to your self-hosted core API:

1.  **Configure static building in `packages/admin`**:
    *   Ensure the React app environment variable points to your public core server: `VITE_API_URL=https://api.yourdomain.com`
2.  **Compile the Admin app**:
    ```bash
    pnpm --filter admin build
    ```
3.  **Host the Assets**:
    Deploy the static files located in `packages/admin/dist` directly to Vercel, Netlify, or Cloudflare Pages.
