import { Zenith } from './packages/core/src'
import dotenv from 'dotenv'

dotenv.config()

async function resetDB() {
  const zenith = new Zenith()
  await zenith.init()
  
  console.log('Connected. Dropping z_schemas...')
  const db = (zenith as any).db
  if (db && db.adapter === 'mongoose') {
     const mongoose = require('mongoose')
     await mongoose.connection.collection('z_schemas').drop().catch(() => console.log('Already dropped'))
  }
  
  console.log('Dropped successfully.')
  process.exit(0)
}

resetDB()
