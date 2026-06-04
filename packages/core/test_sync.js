require('mongoose').connect('mongodb://localhost:27017/zenith').then(async (m) => {
  try {
    const { syncTenantFiles } = require('./dist/database/seed.js');
    const adapter = require('./dist/database/adapters/AdapterFactory').AdapterFactory.getActiveAdapter();
    await adapter.connect();
    console.log('Syncing...');
    await syncTenantFiles(adapter, { _id: '6a0000000000000000000000', id: '6a0000000000000000000000' }, '6a0000000000000000000001');
    console.log('Done syncing!');
  } catch(e) {
    console.error('ERROR:', e)
  } finally {
    m.disconnect();
  }
}).catch(console.error)
