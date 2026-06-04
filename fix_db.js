const mongoose = require('mongoose');

async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith');
  const db = mongoose.connection.db;

  const postsCol = db.collection('posts');
  const posts = await postsCol.find({ content: { $regex: '"__type":"root"' } }).toArray();
  for (const post of posts) {
    await postsCol.updateOne({ _id: post._id }, { $set: { content: '' } });
  }

  console.log('Fixed posts:', posts.length);

  const pagesCol = db.collection('landing-page');
  const pages = await pagesCol.find({}).toArray();
  let pagesFixed = 0;
  for (const page of pages) {
    let changed = false;
    if (page.sections) {
      for (const section of page.sections) {
        if (section.content && section.content.content && typeof section.content.content === 'string' && section.content.content.includes('"__type":"root"')) {
          section.content.content = '';
          changed = true;
        }
      }
    }
    if (changed) {
      await pagesCol.updateOne({ _id: page._id }, { $set: { sections: page.sections } });
      pagesFixed++;
    }
  }
  console.log('Fixed pages:', pagesFixed);

  process.exit(0);
}
run();
