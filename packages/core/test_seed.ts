import mongoose from 'mongoose';
import { seedInitialData } from './src/database/seed';
import { AdapterFactory } from './src/database/adapters/AdapterFactory';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const adapter = AdapterFactory.getActiveAdapter();
  await adapter.connect();
  console.log('Seeding...');
  try {
    await seedInitialData();
    console.log('Done!');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
