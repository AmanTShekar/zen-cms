# 🚀 Zenith Quickstart & Onboarding Guide (`ONBOARDING.md`)

Welcome to Zenith CMS! This onboarding blueprint guides developers and AI systems through launching, seeding, configuring, and integrating the Zenith Headless Engine into high-performance web applications.

---

## ⏱️ 1. Complete Quickstart in 3 Minutes

### Step 1: Clone & Bootstrap

Install all packages and dependencies across the monorepo workspace:

```bash
# Clean install and link packages
npm install
```

### Step 2: Configure Environment

Copy the default local system variables template:

```bash
cp .env.example .env
```

Ensure your `.env` contains valid credentials:

```env
PORT=3000
MONGODB_URI=mongodb://localhost:27017/zenith
JWT_SECRET=super-secret-key-change-in-prod
```

### Step 3: Run the Monorepo Development Environment

Kick off the core backend server, the admin dashboard UI, and the blog storefront simultaneously:

```bash
npm run dev
```

Zenith will launch its nodes:

- 🏛️ **Core API Backend**: [http://localhost:3000](http://localhost:3000)
- 🎨 **Admin Control Panel**: [http://localhost:5173](http://localhost:5173) (Or next active Vite port)
- 🌐 **Vite Storefront Demo**: [http://localhost:3001](http://localhost:3001)

---

## 📊 2. Seeding Content and Schema Modeling

Upon launching the admin dashboard for the first time:

1. **Initialize Admin Account**: Navigate to [http://localhost:5173/register](http://localhost:5173/register) and create your root system administrator.
2. **Launch a Site Workspace**: Add your first active site (e.g. `Zenith Main Store`).
3. **Execute Dynamic Seed**:
   - Navigate to the **Settings** menu on the sidebar.
   - Click **"Run Seed Engine"** to inject dynamic mock data (fully preloaded blogs, products, tags, and layouts) to immediately see how the dynamic page grids compose!

---

## 🌐 3. Integrating the @zenithcms/sdk in Frontend Client

Zenith provides a robust, lightweight SDK that handles connection states, payload parsing, and JWT caching automatically. Below is the standard integration loop inside a frontend React framework:

```typescript
import { ZenithClient } from '@zenithcms/sdk'

// 1. Initialize safe headless context
const cms = new ZenithClient({
  baseUrl: 'http://localhost:3000/api/v1',
  apiKey: process.env.ZENITH_API_KEY, // Server-side or client token
})

// 2. Fetch structured items
export async function getActiveProducts() {
  try {
    const response = await cms.collection('products').find({
      filter: {
        status: { equals: 'published' },
      },
      sort: '-price',
      limit: 10,
    })

    return response.data // Fully parsed, strongly-typed records
  } catch (error) {
    console.error('Zenith SDK Fetch Error:', error)
    return []
  }
}
```

---

## 🏛️ 4. Workspace Build Pipeline Verification

When preparing your workspace for builds or CI/CD integrations, execute these validation gates locally to ensure absolute formatting and compiler integrity:

```bash
# 1. Run global styling alignment checks
npx prettier --write .

# 2. Run lint pipeline
npm run lint

# 3. Test compilation output builds
npm run build
```

Any changes must return **Exit Code `0`** to pass Husky gate protections!
