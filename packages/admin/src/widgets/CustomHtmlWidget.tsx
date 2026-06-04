import { useState } from 'react'
import { cn } from '../lib/utils'
import { sanitizeHtml } from '../lib/sanitize'
import type { WidgetProps } from './registry'

export default function CustomHtmlWidget({
  config = {},
  isEditing,
  onConfigChange,
  theme,
}: WidgetProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(config.html || '')
  const sanitized = sanitizeHtml(config.html || '')

  if (isEditing && editing) {
    return (
      <div className="h-full flex flex-col gap-2">
        <p className="text-[8px] font-black text-amber-500 uppercase tracking-widest italic">
          Scripts are automatically removed for security.
        </p>
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className={cn(
            'flex-1 w-full border rounded-none p-3 font-mono text-[11px] resize-none outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/50 focus-visible:ring-offset-1 focus-visible:ring-offset-black focus:border-emerald-500',
            theme === 'dark' ? 'bg-black border-white/[0.08] text-white' : 'bg-gray-50 border-gray-200'
          )}
          placeholder="<h2>Hello World</h2>"
        />
        <div className="flex gap-2">
          <button
            onClick={() => {
              onConfigChange({ ...config, html: draft })
              setEditing(false)
            }}
            className="px-4 py-2 bg-emerald-600 text-white text-[9px] font-black uppercase tracking-widest rounded-none"
          >
            Save
          </button>
          <button
            onClick={() => setEditing(false)}
            className={cn(
              'px-4 py-2 text-[9px] font-black uppercase tracking-widest rounded-none',
              theme === 'dark' ? 'bg-white/5 text-gray-400' : 'bg-gray-100 text-gray-600'
            )}
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className="h-full overflow-auto relative group"
      onClick={() => isEditing && setEditing(true)}
    >
      {!config.html && (
        <div className="h-full flex items-center justify-center text-[9px] text-gray-500 italic font-black uppercase">
          {isEditing ? 'Click to add HTML' : 'No content set'}
        </div>
      )}
      {config.html && (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-[13px]"
          dangerouslySetInnerHTML={{ __html: sanitized }}
        />
      )}
      {isEditing && (
        <div className="absolute inset-0 border-2 border-dashed border-emerald-500/30 rounded-none pointer-events-none" />
      )}
    </div>
  )
}
