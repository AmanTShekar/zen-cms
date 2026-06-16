import mongoose from 'mongoose';
async function test() {
  await mongoose.connect('mongodb://localhost:27017/zenith-cms');
  const items = await mongoose.connection.db.collection('media').find({}).toArray();
  console.log('Media items:', JSON.stringify(items, null, 2));
  process.exit();
}
test();
