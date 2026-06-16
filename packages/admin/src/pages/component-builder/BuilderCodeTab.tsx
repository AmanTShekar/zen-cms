import React from 'react'
import { motion } from 'framer-motion'
import { Code, ChevronRight, Save, X } from 'lucide-react'
import { cn } from '../../lib/utils'

export const BuilderCodeTab = ({
  codeImport,
  setCodeImport,
  handleCodeImport,
  handleRegisterCode,
  dark
}: any) => {
  return (
    <motion.div key="code" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
      <div className={cn('p-6 border rounded-none-none', dark ? 'bg-black border-white/[0.08]' : 'bg-white border-gray-200 shadow-sm')}>
        <h3 className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1 flex items-center gap-2">
          <Code size={12} /> Import from Code / JSON
        </h3>
        <p className={cn('text-[10px] mb-4 font-medium', dark ? 'text-gray-400' : 'text-gray-500')}>
          Paste a JSON component definition, a TypeScript interface, or a raw fields array. The parser will auto-detect the format.
        </p>

        {/* Format examples */}
        <div className={cn('p-4 rounded-none-none text-[10px] font-mono mb-4 text-gray-600 dark:text-gray-400 border', dark ? 'bg-black border-white/[0.08]' : 'bg-gray-900 border-gray-700')}>
          <p className="text-gray-500 mb-2">// JSON format (recommended)</p>
          {`{
  "slug": "hero-section",
  "displayName": "Hero Section",
  "category": "Layout",
  "description": "Full-width hero with CTA",
  "fields": [
    { "name": "headline", "type": "text", "required": true },
    { "name": "subtext", "type": "textarea" },
    { "name": "backgroundImage", "type": "media" },
    { "name": "ctaLabel", "type": "text" },
    { "name": "ctaUrl", "type": "text" }
  ]
}`}
        </div>

        <textarea
          rows={12}
          value={codeImport}
          onChange={e => setCodeImport(e.target.value)}
          placeholder='Paste JSON or TypeScript interface here...'
          className={cn('w-full border p-4 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-gray-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none-none placeholder:text-gray-600 resize-none', dark ? 'bg-black border-white/[0.08] focus:border-gray-500/50 text-white' : 'bg-gray-50 border-gray-200 focus:border-gray-500 text-gray-900')}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCodeImport}
            disabled={!codeImport.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-500 hover:bg-gray-400 text-white text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all disabled:opacity-40"
          >
            <ChevronRight size={14} /> Import to Visual Editor
          </button>
          <button
            onClick={handleRegisterCode}
            disabled={!codeImport.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all disabled:opacity-40"
            title="Save directly to database without going through visual editor"
          >
            <Save size={14} /> Register Directly
          </button>
          <button
            onClick={() => setCodeImport('')}
            className={cn('flex items-center gap-2 px-4 py-2.5 border text-[10px] font-black uppercase tracking-widest rounded-none-none transition-all', dark ? 'border-white/[0.08] hover:bg-white/5' : 'border-gray-200 hover:bg-gray-50')}
          >
            <X size={14} /> Clear
          </button>
        </div>
      </div>
    </motion.div>
  )
}
