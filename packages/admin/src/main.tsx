import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import api from './lib/api'
import './lib/plugin-registry'

async function bootstrap() {
  try {
    const res = await api.get('/system/plugins')
    const plugins = res.data?.data || []
    
    // Inject plugin scripts
    for (const plugin of plugins) {
      if (plugin.enabled && plugin.config?.url) {
        console.log(`[Zenith] Loading Plugin: ${plugin.name} (${plugin.config.url})`)
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.type = 'module'
          script.src = plugin.config.url
          script.onload = resolve
          script.onerror = () => {
            console.error(`[Zenith] Failed to load plugin script: ${plugin.config.url}`)
            resolve(null) // Resolve anyway to not block app boot
          }
          document.head.appendChild(script)
        })
      }
    }
  } catch (err) {
    console.error('[Zenith] Failed to fetch system plugins at boot', err)
  }

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

bootstrap()
