import { MongoClient } from 'mongodb';
import bcrypt from 'bcrypt';
import http from 'http';

async function waitForServer(url: string, timeoutMs = 60000): Promise<void> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise<void>((resolve, reject) => {
        http.get(url, (res) => {
          // Any response means the server is up
          resolve();
        }).on('error', reject);
      });
      return; // Server is ready
    } catch {
      await new Promise(r => setTimeout(r, 500));
    }
  }
  throw new Error(`Server at ${url} did not become available in ${timeoutMs}ms`);
}

async function globalSetup() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/zenith-e2e';
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db();
    
    // Clear the e2e database to ensure clean state
    const collections = await db.collections();
    for (const collection of collections) {
      await collection.drop();
    }
    
    console.log('E2E Database cleared.');

    // Seed the first admin user so login works right away
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('Admin@1234!', salt);
    
    const user = await db.collection('users').insertOne({
      email: 'admin@zenithcms.local',
      password: hashedPassword,
      role: 'admin',
      displayName: 'System Admin',
      emailVerified: true,
      failedLoginAttempts: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Admin user seeded (admin@zenithcms.local / Admin@1234!)');

    // Seed onboarding state to bypass setup wizard
    await db.collection('z_onboardings').insertOne({
      completedAt: new Date(),
      skipped: false,
      answers: {}
    });

    // Seed a default workspace
    const workspace = await db.collection('workspaces').insertOne({
      name: 'E2E Workspace',
      slug: 'e2e-workspace',
      ownerId: user.insertedId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Seed a default site
    const site = await db.collection('sites').insertOne({
      name: 'E2E Site',
      slug: 'e2e-site',
      workspaceId: workspace.insertedId,
      ownerId: user.insertedId.toString(),
      members: [
        {
          userId: user.insertedId.toString(),
          role: 'admin',
          addedAt: new Date(),
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('Onboarding, Workspace, and Site seeded.');

    const fs = require('fs');
    fs.writeFileSync('tests/e2e/storageState.json', JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: "http://localhost:9176",
          localStorage: [
            { name: "activeWorkspaceId", value: workspace.insertedId.toString() },
            { name: "activeSiteId", value: site.insertedId.toString() }
          ]
        }
      ]
    }));
    console.log('Playwright storageState written.');
  } finally {
    await client.close();
  }
}

export default globalSetup;
