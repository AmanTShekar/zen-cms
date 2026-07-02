import Database from 'better-sqlite3'
import path from 'path'
import { StrapiContentMigrator } from './plugins/strapi-bridge/ContentMigrator'

async function runTest() {
  const dbPath = path.join(process.cwd(), 'test-strapi.db')
  const db = new Database(dbPath)

  console.log('1. Setting up mock Strapi SQLite DB...')
  // Create Strapi settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS strapi_core_store_settings (key TEXT, value TEXT);
    DELETE FROM strapi_core_store_settings;
    INSERT INTO strapi_core_store_settings (key, value) VALUES 
    ('plugin_content_manager_configuration.content-types.api::article.article', '{"uid":"api::article.article"}');
    
    INSERT INTO strapi_core_store_settings (key, value) VALUES 
    ('model_def_api::article.article', '{"attributes":{"title":{"type":"string"},"content":{"type":"richtext"}}}');
    
    CREATE TABLE IF NOT EXISTS articles (id INTEGER PRIMARY KEY, title TEXT, content TEXT, created_at TEXT, updated_at TEXT);
    DELETE FROM articles;
    INSERT INTO articles (title, content, created_at, updated_at) VALUES 
    ('Hello World', 'This is a test article from Strapi!', '2023-01-01', '2023-01-01'),
    ('Second Post', 'Another one.', '2023-01-02', '2023-01-02');
  `)

  console.log('2. Mocking Zenith Adapter...')
  const mockAdapter = {
    registerCollection: async (config: any) => {
      console.log('   -> ZenithAdapter.registerCollection called for:', config.info.singularName)
    },
    create: async (slug: string, doc: any) => {
      console.log('   -> ZenithAdapter.create called for:', slug)
      console.log('      Doc:', doc)
      return { id: 'zen_123' }
    }
  }

  console.log('\n3. Running StrapiContentMigrator...')
  const migrator = new StrapiContentMigrator({
    strapiDbUri: `sqlite://${dbPath}`,
    strapiDbType: 'sqlite',
    strapiBaseUrl: 'http://localhost',
    zenithAdapter: mockAdapter as any,
    batchSize: 10,
    dryRun: false,
    onProgress: (event) => {
      if (event.type === 'collection_done') {
        console.log(`   -> Event: Finished ${event.collection} (${event.processed} records)`)
      }
    }
  })

  await migrator.run()
  console.log('\n4. Test Complete - Success!')
}

runTest().catch(console.error)
