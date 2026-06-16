import mongoose from 'mongoose';
async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const sites = await mongoose.connection.db.collection('sites').find({}).toArray();
  const siteId = sites[0]?._id?.toString() || sites[0]?.slug;
  if (siteId) {
    await mongoose.connection.db.collection('media').updateMany(
      { siteId: { $exists: false } },
      { $set: { siteId: siteId } }
    );
    console.log(`Updated media items with siteId: ${siteId}`);
  } else {
    console.log('No site found.');
  }
  process.exit();
}
run();
