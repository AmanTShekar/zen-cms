const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/zenith').then(async () => {
  const collection = mongoose.connection.collection('z_onboarding');
  await collection.updateOne({}, { $set: { completed: true, currentStep: 'complete', skipped: true, answers: {} } }, { upsert: true });
  console.log('Onboarding marked as complete.');
  process.exit(0);
});
