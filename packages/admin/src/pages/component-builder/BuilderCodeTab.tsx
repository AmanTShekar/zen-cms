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
      <div className={cn('p-6 border rounded-none shadow-sm transition-all', 'z-panel')}>
        <h3 className="text-sm font-semibold text-z-active-text mb-1 flex items-center gap-2">
          <Code size={12} /> Import from Code / JSON
        </h3>
        <p className={cn('text-sm mb-4 font-medium', dark ? 'text-z-muted' : 'text-z-secondary')}>
          Paste a JSON component definition, a TypeScript interface, or a raw fields array. The parser will auto-detect the format.
        </p>

        {/* Format examples */}
        <div className={cn('p-4 rounded-none text-sm font-mono mb-4 text-z-secondary border shadow-inner', dark ? 'bg-z-popover border-z-border' : 'bg-z-accent border-z-border')}>
          <p className="text-z-secondary mb-2">// JSON format (recommended)</p>
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
          className={cn('w-full border p-4 text-sm font-mono outline-none focus-visible:ring-2 focus-visible:ring-z-active-border focus-visible:ring-offset-1 focus-visible:ring-offset-black rounded-none placeholder:text-z-secondary resize-none shadow-inner', dark ? 'bg-z-panel backdrop-blur-sm border-z-border focus:border-z-accent/50 text-z-primary' : 'bg-z-input border-z-border focus:border-z-accent text-z-primary')}
        />

        <div className="flex gap-3 mt-4">
          <button
            onClick={handleCodeImport}
            disabled={!codeImport.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-z-accent hover:brightness-110 text-z-logo-text text-sm font-semibold rounded-none transition-all disabled:opacity-40 shadow-sm"
          >
            <ChevronRight size={14} /> Import to Visual Editor
          </button>
          <button
            onClick={handleRegisterCode}
            disabled={!codeImport.trim()}
            className="flex items-center gap-2 px-5 py-2.5 bg-z-accent hover:brightness-110 text-z-logo-text text-sm font-semibold rounded-none transition-all disabled:opacity-40 shadow-sm"
            title="Save directly to database without going through visual editor"
          >
            <Save size={14} /> Register Directly
          </button>
          <button
            onClick={() => setCodeImport('')}
            className={cn('flex items-center gap-2 px-4 py-2.5 border text-sm font-semibold   rounded-none transition-all', dark ? 'border-z-border hover:bg-z-hover' : 'border-z-border hover:bg-[var(--z-bg-input)]')}
          >
            <X size={14} /> Clear
          </button>
        </div>
      </div>
    </motion.div>
  )
}
