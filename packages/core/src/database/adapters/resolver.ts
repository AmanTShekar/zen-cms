import { logger } from '../../services/logger'
import { env } from '../../config/env';


export function resolveDatabaseConfig(customUri?: string, customType?: 'mongodb' | 'postgres'): { type: 'mongodb' | 'postgres'; uri: string } {
  const mongoUri = process.env.MONGODB_URI
  const postgresUri = process.env.POSTGRES_URI || process.env.DATABASE_URL
  const dbType = customType || env.DATABASE_TYPE

  // Direct explicit selection
  if (dbType === 'postgres') {
    return { type: 'postgres', uri: customUri || postgresUri || 'postgres://localhost:5432/zenith' }
  } else if (dbType === 'mongodb') {
    return { type: 'mongodb', uri: customUri || mongoUri || 'mongodb://localhost:27017/zenith' }
  } else if (customUri) {
    // Auto-detection based on custom uri prefix
    if (customUri.startsWith('postgres://') || customUri.startsWith('postgresql://')) {
      return { type: 'postgres', uri: customUri }
    } else {
      return { type: 'mongodb', uri: customUri }
    }
  } else if (postgresUri && !mongoUri) {
    // Auto-detection based on environment variables presence
    return { type: 'postgres', uri: postgresUri }
  } else {
    // Fallback to default mongodb uri
    if (!mongoUri && !postgresUri) {
      console.warn('\x1b[33m%s\x1b[0m', `
┌────────────────────────────────────────────────────────────┐
│                  ⚠️  ZENITH STARTUP WARNING  ⚠️             │
├────────────────────────────────────────────────────────────┤
│ No active database environment variables were detected.    │
│ Please check that you have created a .env file from the    │
│ .env.example template.                                    │
│                                                            │
│ Expected: MONGODB_URI or POSTGRES_URI / DATABASE_URL       │
│ Defaulting to local MongoDB: mongodb://localhost:27017     │
└────────────────────────────────────────────────────────────┘
      `)
    }
    return { type: 'mongodb', uri: mongoUri || 'mongodb://localhost:27017/zenith' }
  }
}
