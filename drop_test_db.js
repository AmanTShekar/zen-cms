const mongoose = require('mongoose')
async function run() {
  await mongoose.connect('mongodb://localhost:27017/zenith')
  await mongoose.connection.db.dropDatabase()
  console.log('Database zenith dropped')
  process.exit(0)
}
run()
