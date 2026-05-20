# Quickstart & Onboarding Guide

Welcome to Zenith CMS! This guide will help you install, seed, configure, and connect the headless engine to your frontend applications.

---

## ⏱️ Quickstart (Under 5 Minutes)

### Step 1: Install Dependencies
First, install the workspace packages using `pnpm` (ensure you have it installed globally with `npm install -g pnpm`):

```bash
pnpm install
```

### Step 2: Configure Environment Variables
Copy the default environment template:

```bash
cp .env.example .env
```

Open the newly created `.env` file and verify the settings:
*   `PORT`: The port the backend server runs on (defaults to `3000`).
*   `MONGODB_URI` / `DATABASE_URL`: Connection strings for your database of choice.
*   `JWT_SECRET`: A secure key used to sign session cookies.

### Step 3: Run the Development Server
Start the backend engine, the admin control panel, and the frontend demo simultaneously:

```bash
pnpm run dev
```

Zenith will start the following local servers:
*   🏛️ **Core API Backend**: `http://localhost:3000`
*   🎨 **Admin Dashboard**: `http://localhost:5173` (Vite)
*   🌐 **Demo Storefront**: `http://localhost:3001` (Vite)

---

## 📊 Seeding Mock Content

When you log into the admin dashboard for the first time:

1.  **Create an Admin Account**: Navigate to `http://localhost:5173/register` to set up your primary credentials.
2.  **Add a Site**: Define your first workspace site.
3.  **Run Seed**: Go to the **Settings** menu and click **"Run Seed Engine"**. This will populate your database with dummy pages, products, categories, and blocks so you can see how the layout builders function immediately.

---

## 🌐 Connecting the SDK

You can use the lightweight `@zenithcms/sdk` package to query content in your frontend app. Here is a simple example in a React/Next.js application:

```typescript
import { ZenithClient } from '@zenithcms/sdk';

// Initialize the client
const cms = new ZenithClient({
  baseUrl: 'http://localhost:3000/api/v1',
  apiKey: process.env.ZENITH_API_KEY, // Server-side or client token
});

// Fetch products
export async function getActiveProducts() {
  try {
    const response = await cms.collection('products').find({
      filter: {
        status: { equals: 'published' },
      },
      sort: '-price',
      limit: 10,
    });

    return response.data; // Fully typed array of records
  } catch (error) {
    console.error('Failed to fetch products from Zenith:', error);
    return [];
  }
}
```

---

## 🚦 Commit & Build Verification

Before you push any changes to your repository, run these checks to verify everything compiles and adheres to linting standards:

```bash
# Run linting
pnpm run lint

# Test compilation
pnpm run build

# Run unit & integration tests
pnpm test
```
All pull requests are validated against these commands prior to merge!
