import React from 'react'
import { Key, CheckCircle2, Copy } from 'lucide-react'
import { cn } from '../../lib/utils'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'


interface SettingsApiKeyModalProps {
 newKey: any
 setNewKey: any
 theme: 'light' | 'dark'
}

const SettingsApiKeyModal: React.FC<SettingsApiKeyModalProps> = ({ newKey, setNewKey, theme }) => {
 return (
 <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
 <motion.div
 {...({
 initial: { scale: 0.9, opacity: 0 },
 animate: { scale: 1, opacity: 1 },
 exit: { scale: 0.9, opacity: 0 }
 } as any)}
 className={cn(
 'w-full max-w-md rounded-none-none p-6 border shadow-2xl relative overflow-hidden',
 theme === 'dark' ? 'bg-[#0a0a0a] border-z-border' : 'bg-z-panel border-z-border shadow-sm'
 )}
 >
 <div className="absolute top-0 right-0 p-6 text-z-secondary/10 pointer-events-none">
 <Key size={120} strokeWidth={0.5} />
 </div>

 <div className="flex items-center gap-4 mb-8">
 <div className="w-12 h-12 rounded-none-none bg-gray-500/10 flex items-center justify-center text-gray-600 dark:text-z-secondary border border-gray-500/20">
 <CheckCircle2 size={24} />
 </div>
 <div>
 <h3 className="text-lg font-semibold leading-none">Key Generated</h3>
 <p className="text-sm font-bold text-z-secondary mt-2">
 Vault Node: {newKey.name}
 </p>
 </div>
 </div>

 <div className="space-y-4 mb-8">
 <p className="text-sm font-semibold text-amber-500 leading-relaxed">
 CRITICAL: Copy this key now. It will never be displayed again for security integrity.
 </p>
 <div
 className={cn(
 'p-4 rounded-none-none border flex items-center justify-between gap-4 font-mono text-sm font-bold break-all transition-colors',
 theme === 'dark' ? 'bg-z-hover border-z-border' : 'bg-z-input border-z-border shadow-sm'
 )}
 >
 {newKey.key}
 <button
 onClick={() => {
 navigator.clipboard.writeText(newKey.key)
 toast.success('KEY_COPIED_TO_CLIPBOARD')
 }}
 className="p-2.5 rounded-none-none bg-gray-500 text-white shrink-0 shadow-lg shadow-sm/20 hover:scale-105 active:scale-95 transition-all"
 >
 <Copy size={14} />
 </button>
 </div>
 </div>

 <div className="space-y-2 mb-8">
 <p className="text-sm font-bold text-z-muted">
 Frontend .env Integration:
 </p>
 <div className={cn('p-4 rounded-none-none border font-mono text-sm whitespace-pre transition-colors text-gray-600 dark:text-z-muted', theme === 'dark' ? 'bg-[#0a0a0a] border-z-border' : 'bg-gray-900 border-gray-800')}>
{`VITE_CMS_URL=${typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'}/api/v1
VITE_CMS_API_KEY=${newKey.key}
VITE_CMS_SITE_ID=your_tenant_id`}
 </div>
 </div>

 <button
 onClick={() => setNewKey(null)}
 className="w-full py-4 rounded-none-none bg-white text-black font-semibold text-sm hover:bg-gray-200 transition-all"
 >
 I've copied the key
 </button>
 </motion.div>
 </div>
 )
}

export default SettingsApiKeyModal
