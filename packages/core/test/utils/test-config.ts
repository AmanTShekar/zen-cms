import { ZenithConfig } from '../../src/types'

export const getTestConfig = (): ZenithConfig => ({
  database: {
    engine: 'mongodb',
    uri: 'mongodb://localhost:27017/zenith_test'
  },
  server: {
    port: 3000,
    cors: '*'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expiresIn: '1h'
  },
  collections: [],
  globals: []
})
