# Zenith Installation Guide

Zenith can be deployed as a monolithic server or as a decoupled headless engine. This guide covers the standard setup for both local development and production.

---

## 💻 Local Development

### 1. Environment Setup
Create a `.env` file in the root directory:

```env
# SERVER
PORT=3000
NODE_ENV=development

# DATABASE (Choose one)
DATABASE_URI=mongodb://localhost:27017/zenith
# DATABASE_TYPE=postgres
# DATABASE_URL=postgres://user:pass@localhost:5432/zenith

# SECRETS
ZENITH_SECRET=your-super-secret-key
ADMIN_API_KEY=zenith_dev_key_123

# CLOUDINARY (Optional for Media)
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

### 2. Dependency Management
Zenith uses a monorepo structure. Install all packages from the root:
```bash
npm install
```

### 3. Seeding Initial Data
To populate the database with a default admin user and sample collections:
```bash
npm run seed
```

### 4. Running the Platform
```bash
# Start all packages in dev mode
npm run dev
```
*   **Admin UI**: `http://localhost:5173`
*   **API Engine**: `http://localhost:3000`

---

## 🚢 Production Deployment

### 1. Build the Monorepo
```bash
npm run build
```

### 2. Service Management (PM2)
We recommend using PM2 to manage the Zenith Nucleus in production:
```bash
pm2 start dist/server.js --name zenith-nucleus
```

### 3. Reverse Proxy (Nginx)
Configure Nginx to forward traffic to the Zenith port (default 3000). Ensure that `client_max_body_size` is increased for media uploads.

---

## 🗄️ Database Specifics

### MongoDB (Default)
Ensure your MongoDB instance is running as a **Replica Set** if you wish to use transactions (highly recommended for data integrity).

### PostgreSQL (Beta)
Zenith uses **Drizzle ORM** for SQL. When switching to PostgreSQL, ensure you run the migration script:
```bash
npm run db:push
```
