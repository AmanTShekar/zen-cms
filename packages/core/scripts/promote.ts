const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Now dynamically import the adapter factory
async function run() {
  try {
    const { AdapterFactory } = await import('../src/database/adapters/AdapterFactory.js');
    const adapter = AdapterFactory.getActiveAdapter();
    console.log('Connecting to database...');
    const users = await adapter.find('users', {});
    if (users.length > 0) {
      const firstUser = users[0];
      await adapter.update('users', (firstUser.id || firstUser._id).toString(), { role: 'admin' });
      console.log(`Promoted user ${firstUser.email} to admin!`);
    } else {
      console.log('No users found.');
    }
  } catch (err) {
    console.error(err);
  }
  process.exit(0);
}
run();
