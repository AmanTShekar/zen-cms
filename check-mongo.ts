import { Zenith } from './packages/core/src'
import dotenv from 'dotenv'
import mongoose from 'mongoose'

dotenv.config()

async function check() {
  await mongoose.connect(process.env.DATABASE_URL || 'mongodb://localhost:27017/zenith-cms')
  const r = await mongoose.connection.collection('z_schemas').findOne({slug: 'hero'})
  if (r) {
     console.log(JSON.stringify(r.fields.map((f: any) => f.name), null, 2))
  } else {
     console.log('Not found')
  }
  process.exit(0)
}

check()
