import { Zenith } from './packages/core/src'
import dotenv from 'dotenv'

dotenv.config()

async function resetDB() {
  const zenith = new Zenith()
  await zenith.init()
  
  console.log('Connected.')
  const db = (zenith as any).db
  if (db && db.adapter === 'mongoose') {
     const mongoose = require('mongoose')
     await mongoose.connection.collection('z_schemas').deleteMany({})
     console.log('Deleted all from z_schemas')
  }
  
  process.exit(0)
}

resetDB()
