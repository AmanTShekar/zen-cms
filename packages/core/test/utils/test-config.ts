import { ZenithConfig } from '../../src/types'

export const getTestConfig = (): ZenithConfig => ({
  database: {
    engine: 'mongodb',
    uri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/zenith_test'
  },
  server: {
    port: 3000,
    cors: '*'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'secret',
    expiresIn: '1h'
  },
  collections: [
    {
      name: 'posts',
      slug: 'posts',
      fields: [
        { name: 'title', type: 'text', required: true },
        { name: 'content', type: 'richtext', required: false },
        { name: 'slug', type: 'text', unique: true, required: true }
      ]
    }
  ],
  globals: []
})
