const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const db = mongoose.connection.db;

  const pagesCol = db.collection('landing-page');
  const pages = await pagesCol.find({}).toArray();
  for (const page of pages) {
    if (page && page.sections) {
      const originalLength = page.sections.length;
      page.sections = page.sections.filter(s => s.blockType !== 'pageTitle' && s.blockType !== 'pageDescription');
      if (page.sections.length < originalLength) {
        await pagesCol.updateOne({ _id: page._id }, { $set: { sections: page.sections } });
        console.log('Fixed DB: Removed phantom layers from landing-page for site', page.siteId);
      } else {
        console.log('No phantom layers found for site', page.siteId);
      }
    }
  }

  process.exit(0);
}
run();
