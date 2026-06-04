import { useState } from 'react'
import { Copy, Check, CheckCircle2, Loader2, Globe } from 'lucide-react'
import { cn } from '../lib/utils'
import api from '../lib/api'

interface Props {
 apiKey: string
 publicUrl: string
 theme: 'dark' | 'light'
}

type Lang = 'javascript' | 'typescript' | 'nextjs' | 'curl'

const TABS: { id: Lang; label: string }[] = [
 { id: 'javascript', label: 'JavaScript' },
 { id: 'typescript', label: 'TypeScript' },
 { id: 'nextjs', label: 'Next.js' },
 { id: 'curl', label: 'curl' },
]

function buildSnippet(lang: Lang, apiKey: string, publicUrl: string): string {
 const url = publicUrl.replace(/\/$/, '')
 switch (lang) {
 case 'javascript':
 return `// zenith.js
const ZENITH_URL = '${url}';
const ZENITH_KEY = '${apiKey}';

async function getContent(collection, query = {}) {
 const params = new URLSearchParams(query);
 const res = await fetch(\`\${ZENITH_URL}/api/v1/\${collection}?\${params}\`, {
 headers: { 'x-api-key': ZENITH_KEY }
 });
 if (!res.ok) throw new Error('Zenith API error: ' + res.status);
 return res.json();
}

// Usage
const { data: posts } = await getContent('posts', { status: 'published' });`

 case 'typescript':
 return `// lib/zenith.ts
const BASE = '${url}/api/v1';
const KEY = process.env.ZENITH_API_KEY!; // '${apiKey}'

type ZenithResponse<T> = { data: T; meta?: { total: number; page: number } };

export const zenith = {
 get: <T = any>(collection: string, query: Record<string, string> = {}): Promise<ZenithResponse<T>> =>
 fetch(\`\${BASE}/\${collection}?\${new URLSearchParams(query)}\`, {
 headers: { 'x-api-key': KEY, 'Content-Type': 'application/json' },
 }).then(r => { if (!r.ok) throw new Error(r.statusText); return r.json(); }),
};

// Usage
const { data: posts } = await zenith.get<Post[]>('posts', { status: 'published' });`

 case 'nextjs':
 return `// lib/zenith.ts
export const zenith = {
 get: (collection: string, query: Record<string, string> = {}, revalidate = 60) =>
 fetch(\`${url}/api/v1/\${collection}?\${new URLSearchParams(query)}\`, {
 headers: { 'x-api-key': process.env.ZENITH_API_KEY! },
 next: { revalidate }, // ISR — refresh every 60s
 }).then(r => r.json()),
};

// .env.local
// ZENITH_API_KEY=${apiKey}

// app/blog/page.tsx
import { zenith } from '@/lib/zenith';
export default async function BlogPage() {
 const { data: posts } = await zenith.get('posts', { status: 'published' });
 return (
 <main>
 {posts.map((p: any) => <h2 key={p._id}>{p.title}</h2>)}
 </main>
 );
}`

 case 'curl':
 return `# Fetch all published posts
curl '${url}/api/v1/posts?status=published' \\
 -H 'x-api-key: ${apiKey}'

# Fetch a single document by ID
curl '${url}/api/v1/posts/DOCUMENT_ID' \\
 -H 'x-api-key: ${apiKey}'

# Create a document (requires editor or admin key)
curl -X POST '${url}/api/v1/posts' \\
 -H 'x-api-key: ${apiKey}' \\
 -H 'Content-Type: application/json' \\
 -d '{"title":"Hello World","status":"published"}'`

 default:
 return ''
 }
}

export default function ConnectSnippet({ apiKey, publicUrl, theme }: Props) {
 const [tab, setTab] = useState<Lang>('javascript')
 const [copied, setCopied] = useState(false)
 const [testing, setTesting] = useState(false)
 const [testResult, setTestResult] = useState<'idle' | 'ok' | 'error'>('idle')
 const isDark = theme === 'dark'

 const snippet = buildSnippet(tab, apiKey, publicUrl)

 const copySnippet = () => {
 navigator.clipboard.writeText(snippet)
 setCopied(true)
 setTimeout(() => setCopied(false), 2500)
 }

 const testConnection = async () => {
 setTesting(true)
 setTestResult('idle')
 try {
 await api.get('/system/health', { headers: { 'x-api-key': apiKey } })
 setTestResult('ok')
 } catch {
 setTestResult('error')
 } finally {
 setTesting(false)
 }
 }

 return (
 <div className="space-y-4">
 {/* Tab bar */}
 <div className="flex gap-1 border-b border-white/[0.08]">
 {TABS.map((t) => (
 <button
 key={t.id}
 onClick={() => setTab(t.id)}
 className={cn(
 'px-4 py-2 text-[9px] font-black uppercase tracking-widest border-b-2 -mb-px transition-all',
 tab === t.id
 ? 'border-emerald-500 text-emerald-400'
 : 'border-transparent text-gray-500 hover:text-gray-300'
 )}
 >
 {t.label}
 </button>
 ))}
 </div>

 {/* Code block */}
 <div
 className={cn(
 'relative rounded-none border overflow-hidden',
 isDark ? 'bg-black border-white/[0.08]' : 'bg-gray-900 border-gray-700'
 )}
 >
 <pre className="overflow-x-auto p-5 text-[11px] font-mono text-gray-300 leading-relaxed">
 <code>{snippet}</code>
 </pre>
 <button
 onClick={copySnippet}
 className={cn(
 'absolute top-3 right-3 p-2 border rounded-none text-[9px] font-black uppercase transition-all',
 copied
 ? 'border-emerald-500 text-emerald-500 bg-emerald-500/10'
 : 'border-white/[0.08] text-gray-400 hover:border-white/30 bg-black/40'
 )}
 >
 {copied ? <Check size={13} /> : <Copy size={13} />}
 </button>
 </div>

 {/* Live test */}
 <div className="flex items-center gap-3">
 <button
 onClick={testConnection}
 disabled={testing || !apiKey}
 className={cn(
 'flex items-center gap-2 px-5 py-2.5 border text-[9px] font-black uppercase rounded-none transition-all',
 isDark
 ? 'border-white/[0.08] text-gray-400 hover:border-emerald-500/40 hover:text-emerald-400'
 : 'border-gray-200 text-gray-600 hover:border-emerald-300'
 )}
 >
 {testing ? <Loader2 size={13} className="animate-spin" /> : <Globe size={13} />}
 Test Connection
 </button>

 {testResult === 'ok' && (
 <span className="flex items-center gap-2 text-[9px] font-black uppercase text-emerald-500">
 <CheckCircle2 size={13} /> Connected successfully
 </span>
 )}
 {testResult === 'error' && (
 <div className="text-[9px] font-black uppercase text-red-400 space-y-1">
 <p>Connection failed. Check that:</p>
 <ul className="list-disc list-inside text-gray-500 normal-case not- font-medium space-y-0.5">
 <li>
 Your CMS is running at <code className="text-gray-300">{publicUrl}</code>
 </li>
 <li>The API key is not expired or revoked</li>
 <li>This origin is in Settings → Allowed Origins</li>
 </ul>
 </div>
 )}
 </div>
 </div>
 )
}
