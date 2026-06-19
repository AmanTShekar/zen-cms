const mongoose = require('mongoose');
const { ObjectId } = require('mongodb');
const bcrypt = require('bcryptjs');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const db = mongoose.connection.db;

  const passwordHash = await bcrypt.hash('Zenith2024!', 10);

  // 1. Create admin user
  const adminId = new ObjectId();
  await db.collection('users').insertOne({
    _id: adminId,
    id: adminId.toString(),
    email: 'admin@zenith.com',
    name: 'Admin User',
    password: passwordHash,
    role: 'admin',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 2. Create test user
  const testId = new ObjectId();
  await db.collection('users').insertOne({
    _id: testId,
    id: testId.toString(),
    email: 'test@zenith.com',
    name: 'Test Editor',
    password: passwordHash,
    role: 'editor',
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 3. Create workspace
  const workspaceId = new ObjectId();
  await db.collection('z_workspaces').insertOne({
    _id: workspaceId,
    id: workspaceId.toString(),
    name: 'Zenith Global Workspace',
    slug: 'zenith-global',
    ownerId: adminId.toString(),
    members: [
      { userId: adminId.toString(), role: 'admin', addedAt: new Date() },
      { userId: testId.toString(), role: 'editor', addedAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  // 4. Create Site
  const siteId = new ObjectId();
  await db.collection('z_sites').insertOne({
    _id: siteId,
    id: siteId.toString(),
    name: 'Primary Storefront',
    slug: 'primary-storefront',
    icon: '🌐',
    description: 'The main global storefront for Zenith CMS',
    ownerId: adminId.toString(),
    workspaceId: workspaceId.toString(),
    members: [
      { userId: adminId.toString(), role: 'admin', addedAt: new Date() },
      { userId: testId.toString(), role: 'editor', addedAt: new Date() }
    ],
    collections: [],
    globals: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log('Successfully restored users, workspace, and site!');
  await mongoose.disconnect();
}

run().catch(console.error);
