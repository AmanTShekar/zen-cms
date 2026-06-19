import { config } from 'dotenv'
import path from 'path'
import { AdapterFactory } from '../src/database/adapters/AdapterFactory'
import fs from 'fs'

config({ path: path.join(__dirname, '../../../.env') })

async function restore() {
  const adapter = AdapterFactory.getActiveAdapter()
  await adapter.connect()

  const payloadPath = path.join(__dirname, '../failed-layout-payload.json')
  const payloadStr = fs.readFileSync(payloadPath, 'utf8')
  const payload = JSON.parse(payloadStr)

  // fix y: null -> y: 999
  const widgets = payload.body.widgets.map((w: any) => ({
    ...w,
    position: {
      ...w.position,
      y: w.position.y === null ? 999 : w.position.y
    }
  }))

  const adminUser = await adapter.findOne('z_users', { role: 'admin' })
  if (!adminUser) {
    console.log('No admin user found')
    process.exit(1)
  }

  // Update layout
  const layout = await adapter.findOne('z_dashboard_layouts', { userId: adminUser._id || adminUser.id })
  if (layout) {
    await adapter.update('z_dashboard_layouts', (layout.id || layout._id).toString(), {
      widgets,
      columns: 12,
      updated_at: new Date()
    })
    console.log('Layout updated')
  } else {
    await adapter.create('z_dashboard_layouts', {
      userId: adminUser._id || adminUser.id,
      siteId: null,
      widgets,
      columns: 12,
      updated_at: new Date()
    })
    console.log('Layout created')
  }

  await adapter.disconnect()
}

restore().catch(console.error)
