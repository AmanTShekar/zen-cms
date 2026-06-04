
import mongoose from 'mongoose';
import { MongooseAdapter } from './packages/db-mongodb/src/MongooseAdapter';

(async () => {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const adapter = new MongooseAdapter();
  
  await adapter.registerCollection({
    slug: 'site-settings',
    fields: [{ name: 'siteName', type: 'text' }]
  });

  try {
    await adapter.find('site-settings', { siteId: 'storefront-glass' });
    console.log('Success');
  } catch (err) {
    console.error('Error:', err.message);
  }

  mongoose.disconnect();
})();

