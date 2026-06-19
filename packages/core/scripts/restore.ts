import mongoose from 'mongoose';
import bcrypt from 'bcrypt';

async function restore() {
  await mongoose.connect('mongodb://localhost:27017/zenith');

  const db = mongoose.connection.db;
  if (!db) throw new Error('No db');

  console.log('Connected to DB');

  const passwordHash = await bcrypt.hash('Zenith2024!', 10);
  let adminUser = await db.collection('users').findOne({ email: 'admin@zenith.com' });
  if (!adminUser) {
    const adminId = new mongoose.Types.ObjectId();
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
    adminUser = await db.collection('users').findOne({ email: 'admin@zenith.com' });
  }

  let testUser = await db.collection('users').findOne({ email: 'test@zenith.com' });
  if (!testUser) {
    const testId = new mongoose.Types.ObjectId();
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
    testUser = await db.collection('users').findOne({ email: 'test@zenith.com' });
  }

  const adminIdStr = adminUser._id.toString();
  const testIdStr = testUser._id.toString();
  let workspace = await db.collection('z_workspaces').findOne({ slug: 'zenith-global' });
  if (!workspace) {
    const workspaceId = new mongoose.Types.ObjectId();
    await db.collection('z_workspaces').insertOne({
      _id: workspaceId,
      id: workspaceId.toString(),
      name: 'Zenith Global Workspace',
      slug: 'zenith-global',
      ownerId: adminIdStr,
      members: [{ userId: adminIdStr, role: 'admin', addedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date()
    });
    workspace = await db.collection('z_workspaces').findOne({ slug: 'zenith-global' });
  }

  const workspaceIdStr = workspace.id || workspace._id.toString();

  let site = await db.collection('z_sites').findOne({ slug: 'primary-storefront' });
  if (!site) {
    const siteId = new mongoose.Types.ObjectId();
    await db.collection('z_sites').insertOne({
      _id: siteId,
      id: siteId.toString(),
      name: 'Primary Storefront',
      slug: 'primary-storefront',
      icon: '🌐',
      description: 'The main global storefront for Zenith CMS',
      ownerId: adminIdStr,
      workspaceId: workspaceIdStr,
      members: [{ userId: adminIdStr, role: 'admin', addedAt: new Date() }, { userId: testIdStr, role: 'editor', addedAt: new Date() }],
      collections: [],
      globals: [],
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  console.log('Restored admin user, workspace, and site!');
  process.exit(0);
}

restore().catch(console.error);
