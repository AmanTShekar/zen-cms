process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'mock_jwt_secret_must_be_at_least_32_characters_long'
process.env.JWT_REFRESH_SECRET = 'mock_jwt_refresh_secret_must_be_at_least_32_characters_long'
process.env.DATABASE_TYPE = process.env.DATABASE_TYPE || 'mongodb'

import { MongoMemoryServer } from 'mongodb-memory-server'
import { beforeAll, afterAll } from 'vitest'

let mongod: MongoMemoryServer

beforeAll(async () => {
  if (process.env.DATABASE_TYPE === 'mongodb') {
    mongod = await MongoMemoryServer.create()
    const uri = mongod.getUri()
    process.env.MONGO_URI = uri
  } else if (process.env.DATABASE_TYPE === 'postgres') {
    process.env.POSTGRES_URI = 'postgresql://postgres:postgres@localhost:5432/zenith_test_unit'
  }
})

afterAll(async () => {
  if (mongod) {
    await mongod.stop()
  }
})
