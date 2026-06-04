import React, { useState } from 'react'
import { Terminal, Code, Copy, Check, Info, Server, Database, Sparkles } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ApiIntegrationGuideProps {
  theme: 'light' | 'dark'
  apiKeys: any[]
}

const ApiIntegrationGuide: React.FC<ApiIntegrationGuideProps> = ({ theme, apiKeys }) => {
  const [activeLang, setActiveLang] = useState<'fetch' | 'curl' | 'axios'>('fetch')
  const [copied, setCopied] = useState(false)
  const activeSiteId = localStorage.getItem('activeSiteId') || '<YOUR_SITE_ID>'

  const baseUrl = window.location.origin
  
  const snippets = {
    fetch: `fetch('${baseUrl}/api/sites/${activeSiteId}/collections/posts/items', {
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'X-Zenith-Site-Id': '${activeSiteId}'
  }
})
.then(res => res.json())
.then(data => console.log(data));`,
    curl: `curl -X GET '${baseUrl}/api/sites/${activeSiteId}/collections/posts/items' \\
  -H 'Authorization: Bearer <YOUR_API_KEY>' \\
  -H 'X-Zenith-Site-Id: ${activeSiteId}'`,
    axios: `import axios from 'axios';

axios.get('${baseUrl}/api/sites/${activeSiteId}/collections/posts/items', {
  headers: {
    'Authorization': 'Bearer <YOUR_API_KEY>',
    'X-Zenith-Site-Id': '${activeSiteId}'
  }
}).then(response => console.log(response.data));`
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(snippets[activeLang])
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="mt-12 pt-12 border-t border-white/10 space-y-8">
      <div className="flex flex-col gap-2">
        <h3 className="text-xl font-black uppercase italic tracking-tight flex items-center gap-3">
          <Terminal className="text-emerald-500" size={24} />
          Developer Integration Guide
        </h3>
        <p className="text-[12px] text-gray-500 font-bold uppercase tracking-widest max-w-2xl">
          Everything you need to connect your frontend to Zenith CMS. Follow these steps to fetch your content dynamically.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className={cn(
          "p-6 border rounded-none relative overflow-hidden group",
          theme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-gray-50 border-gray-200"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Server size={48} />
          </div>
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-none mb-4 font-black">1</div>
          <h4 className="text-[14px] font-black uppercase italic mb-2">Generate a Key</h4>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            Create an API key above. Make sure to copy the secret key immediately, as it will only be shown once for security reasons.
          </p>
        </div>

        <div className={cn(
          "p-6 border rounded-none relative overflow-hidden group",
          theme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-gray-50 border-gray-200"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Info size={48} />
          </div>
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-none mb-4 font-black">2</div>
          <h4 className="text-[14px] font-black uppercase italic mb-2">Site Identification</h4>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            Include the <strong>X-Zenith-Site-Id</strong> header in all your requests. Your current site ID is <code className="bg-black/20 px-1 py-0.5 rounded text-emerald-500">{activeSiteId}</code>.
          </p>
        </div>

        <div className={cn(
          "p-6 border rounded-none relative overflow-hidden group",
          theme === 'dark' ? "bg-white/[0.02] border-white/10" : "bg-gray-50 border-gray-200"
        )}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Database size={48} />
          </div>
          <div className="w-10 h-10 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-none mb-4 font-black">3</div>
          <h4 className="text-[14px] font-black uppercase italic mb-2">Fetch Collections</h4>
          <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
            Query the endpoints to retrieve your data. Replace <code>posts</code> in the URL with the name of your specific collection.
          </p>
        </div>
      </div>

      <div className={cn(
        "border rounded-none overflow-hidden mt-8",
        theme === 'dark' ? "bg-[#0A0A0A] border-white/10" : "bg-gray-900 border-gray-800"
      )}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/40">
          <div className="flex items-center gap-2">
            {(['fetch', 'curl', 'axios'] as const).map(lang => (
              <button
                key={lang}
                onClick={() => setActiveLang(lang)}
                className={cn(
                  "px-4 py-1.5 text-[11px] font-black uppercase tracking-wider rounded-none transition-all",
                  activeLang === lang 
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                )}
              >
                {lang}
              </button>
            ))}
          </div>
          <button
            onClick={handleCopy}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 text-[11px] font-bold uppercase"
          >
            {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
        <div className="p-6 overflow-x-auto">
          <pre className="text-[13px] text-emerald-50/80 font-mono leading-relaxed">
            <code dangerouslySetInnerHTML={{
              __html: snippets[activeLang]
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/'(.*?)'/g, '<span class="text-emerald-300">\'$1\'</span>')
                .replace(/&lt;YOUR_API_KEY&gt;/g, '<span class="text-amber-400 font-bold">&lt;YOUR_API_KEY&gt;</span>')
            }} />
          </pre>
        </div>
      </div>

      <div className={cn(
        "p-6 border-l-4 border-emerald-500 bg-emerald-500/5 mt-6",
        theme === 'dark' ? "text-emerald-100" : "text-gray-800"
      )}>
        <h4 className="flex items-center gap-2 text-[14px] font-black uppercase italic mb-2 text-emerald-500">
          <Sparkles size={16} />
          Pro Tip for Next.js / React Users
        </h4>
        <p className="text-[12px] font-medium leading-relaxed opacity-80">
          Never expose your API keys in the browser! Always make calls to Zenith CMS from a secure environment like Next.js API Routes, Server Actions, or getServerSideProps. Use environment variables (e.g., <code>process.env.ZENITH_API_KEY</code>) to store your keys safely.
        </p>
      </div>
    </div>
  )
}

export default ApiIntegrationGuide
