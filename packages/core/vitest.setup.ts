import { MongoMemoryServer } from 'mongodb-memory-server'
import { beforeAll, afterAll } from 'vitest'

let mongod: MongoMemoryServer

beforeAll(async () => {
  mongod = await MongoMemoryServer.create()
  const uri = mongod.getUri()
  process.env.MONGO_URI = uri
})

afterAll(async () => {
  if (mongod) {
    await mongod.stop()
  }
})
