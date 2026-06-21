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
 <div className="mt-12 pt-12 border-t border-z-border space-y-8">
 <div className="flex flex-col gap-2">
 <h3 className="text-xl font-semibold flex items-center gap-3">
 <Terminal className="text-gray-600 dark:text-z-secondary" size={24} />
 Developer Integration Guide
 </h3>
 <p className="text-sm text-z-secondary font-bold max-w-2xl">
 Everything you need to connect your frontend to Zenith CMS. Follow these steps to fetch your content dynamically.
 </p>
 </div>

 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
 <div className={cn(
 "p-6 border rounded-none-none relative overflow-hidden group",
 theme === 'dark' ? "bg-z-panel border-z-border" : "bg-z-input border-z-border"
 )}>
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
 <Server size={48} />
 </div>
 <div className="w-10 h-10 bg-gray-500/20 text-gray-600 dark:text-z-secondary flex items-center justify-center rounded-none-none mb-4 font-semibold">1</div>
 <h4 className="text-[14px] font-semibold mb-2">Generate a Key</h4>
 <p className="text-sm text-z-secondary font-medium leading-relaxed">
 Create an API key above. Make sure to copy the secret key immediately, as it will only be shown once for security reasons.
 </p>
 </div>

 <div className={cn(
 "p-6 border rounded-none-none relative overflow-hidden group",
 theme === 'dark' ? "bg-z-panel border-z-border" : "bg-z-input border-z-border"
 )}>
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
 <Info size={48} />
 </div>
 <div className="w-10 h-10 bg-gray-500/20 text-gray-600 dark:text-z-secondary flex items-center justify-center rounded-none-none mb-4 font-semibold">2</div>
 <h4 className="text-[14px] font-semibold mb-2">Site Identification</h4>
 <p className="text-sm text-z-secondary font-medium leading-relaxed">
 Include the <strong>X-Zenith-Site-Id</strong> header in all your requests. Your current site ID is <code className="bg-black/20 px-1 py-0.5 rounded-none text-gray-600 dark:text-z-secondary">{activeSiteId}</code>.
 </p>
 </div>

 <div className={cn(
 "p-6 border rounded-none-none relative overflow-hidden group",
 theme === 'dark' ? "bg-z-panel border-z-border" : "bg-z-input border-z-border"
 )}>
 <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
 <Database size={48} />
 </div>
 <div className="w-10 h-10 bg-gray-500/20 text-gray-600 dark:text-z-secondary flex items-center justify-center rounded-none-none mb-4 font-semibold">3</div>
 <h4 className="text-[14px] font-semibold mb-2">Fetch Collections</h4>
 <p className="text-sm text-z-secondary font-medium leading-relaxed">
 Query the endpoints to retrieve your data. Replace <code>posts</code> in the URL with the name of your specific collection.
 </p>
 </div>
 </div>

 <div className={cn(
 "border rounded-none-none overflow-hidden mt-8",
 theme === 'dark' ? "bg-[#0A0A0A] border-z-border" : "bg-gray-900 border-gray-800"
 )}>
 <div className="flex items-center justify-between px-4 py-3 border-b border-z-border bg-black/40">
 <div className="flex items-center gap-2">
 {(['fetch', 'curl', 'axios'] as const).map(lang => (
 <button
 key={lang}
 onClick={() => setActiveLang(lang)}
 className={cn(
 "px-4 py-1.5 text-sm font-semibold   rounded-none-none transition-all",
 activeLang === lang 
 ? "bg-gray-500/20 text-gray-600 dark:text-z-muted border border-gray-500/30" 
 : "text-z-secondary hover:text-gray-300 border border-transparent"
 )}
 >
 {lang}
 </button>
 ))}
 </div>
 <button
 onClick={handleCopy}
 className="text-z-muted hover:text-white transition-colors flex items-center gap-2 text-sm font-bold"
 >
 {copied ? <Check size={14} className="text-gray-600 dark:text-z-secondary" /> : <Copy size={14} />}
 {copied ? 'Copied!' : 'Copy Code'}
 </button>
 </div>
 <div className="p-6 overflow-x-auto">
 <pre className="text-[13px] text-gray-50/80 font-mono leading-relaxed">
 <code dangerouslySetInnerHTML={{
 __html: snippets[activeLang]
 .replace(/&/g, '&amp;')
 .replace(/</g, '&lt;')
 .replace(/>/g, '&gt;')
 .replace(/'(.*?)'/g, '<span class="text-gray-300">\'$1\'</span>')
 .replace(/&lt;YOUR_API_KEY&gt;/g, '<span class="text-amber-400 font-bold">&lt;YOUR_API_KEY&gt;</span>')
 }} />
 </pre>
 </div>
 </div>

 <div className={cn(
 "p-6 border-l-4 border-gray-500 bg-gray-500/5 mt-6",
 theme === 'dark' ? "text-gray-100" : "text-gray-800"
 )}>
 <h4 className="flex items-center gap-2 text-[14px] font-semibold mb-2 text-gray-600 dark:text-z-secondary">
 <Sparkles size={16} />
 Pro Tip for Next.js / React Users
 </h4>
 <p className="text-sm font-medium leading-relaxed opacity-80">
 Never expose your API keys in the browser! Always make calls to Zenith CMS from a secure environment like Next.js API Routes, Server Actions, or getServerSideProps. Use environment variables (e.g., <code>process.env.ZENITH_API_KEY</code>) to store your keys safely.
 </p>
 </div>
 </div>
 )
}

export default ApiIntegrationGuide
