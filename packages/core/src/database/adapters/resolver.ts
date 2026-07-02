import { logger } from '../../services/logger'
import { env } from '../../config/env';


export function resolveDatabaseConfig(customUri?: string, customType?: 'mongodb' | 'postgres'): { type: 'mongodb' | 'postgres'; uri: string } {
  const mongoUri = process.env.MONGODB_URI
  const postgresUri = process.env.POSTGRES_URI || process.env.DATABASE_URL
  const dbType = customType || env.DATABASE_TYPE

  // Direct explicit selection
  if (dbType === 'postgres') {
    const uri = customUri || postgresUri
    if (!uri) throw new Error('POSTGRES_URI environment variable is required when using postgres')
    return { type: 'postgres', uri }
  } else if (dbType === 'mongodb') {
    const uri = customUri || mongoUri
    if (!uri) throw new Error('MONGODB_URI environment variable is required when using mongodb')
    return { type: 'mongodb', uri }
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
  } else if (mongoUri) {
    return { type: 'mongodb', uri: mongoUri }
  } else {
    throw new Error('Database configuration missing. Provide MONGODB_URI or POSTGRES_URI.')
  }
}
