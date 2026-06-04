import React, { useMemo } from 'react'
import { useEditorStore } from '../../../store/editorStore'
import { useTheme } from '../../../context/ThemeContext'
import { cn } from '../../../lib/utils'

export const EditorStatusBar: React.FC = () => {
  const { theme } = useTheme()
  const data = useEditorStore((s) => s.data)

  const stats = useMemo(() => {
    if (!data) return { words: 0, chars: 0, blocks: 0 }

    const allText: string[] = []

    if (data.title) allText.push(data.title)
    if (data.heroDescription) allText.push(
      typeof data.heroDescription === 'string'
        ? data.heroDescription
        : String(data.heroDescription)
    )
    ;(data.sections || []).forEach((section: any) => {
      Object.values(section.content || {}).forEach((val) => {
        if (typeof val === 'string') allText.push(val)
        else if (typeof val === 'object') {
          try {
            const str = JSON.stringify(val)
            if (!str.startsWith('[{') && !str.startsWith('{')) {
              const clean = str.replace(/<[^>]+>/g, ' ').trim()
              if (clean) allText.push(clean)
            }
          } catch {
            // silent ignore
          }
        }
      })
    })

    const combined = allText.join(' ')
    const words = combined.trim() ? combined.trim().split(/\s+/).length : 0
    const chars = combined.replace(/\s+/g, '').length

    return {
      words,
      chars,
      blocks: (data.sections || []).length,
    }
  }, [data])

  return (
    <div
      className={cn(
        'h-7 border-t flex items-center justify-between px-5 shrink-0 select-none',
        theme === 'dark'
          ? 'bg-[#0B0F19]/90 border-white/[0.08] text-gray-600'
          : 'bg-white/90 border-gray-100 text-gray-400'
      )}
    >
      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest italic">
        <span>
          <span className="font-black">{stats.words.toLocaleString()}</span>{' '}
          <span className={stats.words === 0 ? 'text-rose-500/50' : ''}>words</span>
        </span>
        <span className="w-px h-3 bg-white/10" />
        <span>
          <span className="font-black">{stats.chars.toLocaleString()}</span>{' '}
          <span className={stats.chars === 0 ? 'text-rose-500/50' : ''}>chars</span>
        </span>
        <span className="w-px h-3 bg-white/10" />
        <span>
          <span className="font-black">{stats.blocks}</span>{' '}
          {stats.blocks === 1 ? 'block' : 'blocks'}
        </span>
      </div>
      <div className="flex items-center gap-4 text-xs font-black uppercase tracking-widest italic text-gray-600/50">
        <span>ZENITH EDITOR</span>
        <span>v0.2</span>
      </div>
    </div>
  )
}

export default EditorStatusBar
