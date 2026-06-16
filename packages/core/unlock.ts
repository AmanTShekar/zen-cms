import mongoose from 'mongoose';

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  console.log('Unlocking admin@zenith.com...');
  try {
    const users = mongoose.connection.db.collection('users');
    const result = await users.updateOne(
      { email: 'admin@zenith.com' },
      { $set: { failedLoginAttempts: 0, lockUntil: null } }
    );
    console.log('Account unlocked!', result);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    mongoose.disconnect();
  }
}

run();
