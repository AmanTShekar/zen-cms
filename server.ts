/**
 * Zenith CMS — Server Entry Point
 * ─────────────────────────────
 * ONE command to start everything:
 *   pnpm dev
 *
 * All collections in cms.config.ts are auto-registered.
 * No extra code needed.
 */
import { createZenith, seoPlugin, slugPlugin } from './packages/core/src'
import config from './cms.config'

async function main() {
  const cms = await createZenith({
    config,
    plugins: [seoPlugin, slugPlugin({ from: 'title' })],
    port: Number(process.env.PORT) || 3000,
    cors: {
      origins: process.env.CORS_ORIGINS
        ? process.env.CORS_ORIGINS.split(',').map((o) => o.trim())
        : [
            'http://localhost:5173',
            'http://localhost:5174',
            'http://localhost:5175',
            'http://localhost:5176',
          ],
    },
  })

  cms.start()
}

main().catch((err) => {
  console.error('Fatal startup error:', err)
  process.exit(1)
})
