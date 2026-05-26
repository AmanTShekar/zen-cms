/* eslint-disable react-hooks/preserve-manual-memoization */
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import { useEditor, EditorContent, type Editor, Extension } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Link as TiptapLink } from '@tiptap/extension-link'
import Image from '@tiptap/extension-image'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  List,
  Link as LinkIcon,
  ImageIcon,
  X,
  Loader2,
  ChevronDown,
  Palette,
  Check,
  LetterText,
  Eraser,
  Heading1,
  Heading2,
  Heading3,
  Text,
  ListOrdered,
  Quote,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'
import { SlashMenu, type SlashMenuItem } from '../pages/editor/components/SlashMenu'
const FontSize = Extension.create({
  name: 'fontSize',
  addOptions() {
    return {
      types: ['textStyle'],
    }
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element) => element.style.fontSize?.replace(/['"]+/g, ''),
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {}
              return { style: `font-size: ${attributes.fontSize}` }
            },
          },
        },
      },
    ]
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize }).run(),
      unsetFontSize:
        () =>
        ({ chain }: any) =>
          chain().setMark('textStyle', { fontSize: null }).removeEmptyTextStyle().run(),
    } as Record<string, any>
  },
})

export type EditorMode = 'full' | 'inline' | 'heading' | 'micro'

interface RichTextEditorProps {
  value: any
  onChange: (value: any) => void
  placeholder?: string
  mode?: EditorMode
  className?: string
  disabled?: boolean
  format?: 'html' | 'json'
}

interface ToolBtnProps {
  onClick?: (e: React.MouseEvent) => void
  isActive?: boolean
  title?: string
  children: React.ReactElement
  className?: string
}

const ToolBtn = ({ onClick, isActive, title, children, className }: ToolBtnProps) => {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={cn(
        'w-9 h-9 rounded-none transition-all flex items-center justify-center relative active:scale-90 group/btn',
        isActive
          ? theme === 'dark'
            ? 'bg-indigo-500/20 text-indigo-400'
            : 'bg-indigo-50 text-indigo-600'
          : theme === 'dark'
            ? 'text-gray-500 hover:bg-white/5 hover:text-white'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        className
      )}
    >
      {React.cloneElement(children as React.ReactElement<any>, {
        size: 18,
        className: 'group-hover/btn:scale-110 transition-transform',
      })}
    </button>
  )
}

const ColorPicker = ({
  onSelect,
  activeColor,
}: {
  onSelect: (c: string) => void
  activeColor?: string
}) => {
  const { theme } = useTheme()
  const colors = [
    '#000000',
    '#374151',
    '#6b7280',
    '#9ca3af',
    '#d1d5db',
    '#ffffff',
    '#ef4444',
    '#f97316',
    '#f59e0b',
    '#10b981',
    '#06b6d4',
    '#3b82f6',
    '#6366f1',
    '#8b5cf6',
    '#d946ef',
    '#f43f5e',
    '#111827',
    '#4338ca',
  ]
  return (
    <div
      className={cn(
        'p-3 grid grid-cols-6 gap-2 border shadow-[0_30px_60px_rgba(0,0,0,0.5)] rounded-none w-52 backdrop-blur-2xl z-[1000]',
        theme === 'dark' ? 'bg-black/95 border-white/10' : 'bg-white border-gray-200'
      )}
    >
      {colors.map((c) => (
        <button
          key={c}
          onClick={() => onSelect(c)}
          className="w-6 h-6 rounded-none border border-gray-100/10 flex items-center justify-center group shadow-sm transition-all hover:scale-110 active:scale-90"
          style={{ backgroundColor: c }}
        >
          {activeColor?.toLowerCase() === c.toLowerCase() && (
            <Check size={10} className={cn(c === '#ffffff' ? 'text-black' : 'text-white')} />
          )}
        </button>
      ))}
    </div>
  )
}

const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  mode = 'full',
  className,
  disabled = false,
  format = 'html',
}) => {
  const { theme } = useTheme()
  const [isMediaOpen, setIsMediaOpen] = useState(false)
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showColor, setShowColor] = useState(false)
  const [showFont, setShowFont] = useState(false)
  const [showFontSize, setShowFontSize] = useState(false)
  const [showHeadings, setShowHeadings] = useState(false)
  const [selectedFont, setSelectedFont] = useState('Inter')

  // Slash Command Menu States
  const [slashMenuOpen, setSlashMenuOpen] = useState(false)
  const [slashMenuPosition, setSlashMenuPosition] = useState({ top: 0, left: 0 })
  const [slashSelectedIndex, setSlashSelectedIndex] = useState(0)
  const [slashQuery, setSlashQuery] = useState('')

  const fonts = [
    { name: 'Inter', family: 'Inter, sans-serif' },
    { name: 'Roboto', family: 'Roboto, sans-serif' },
    { name: 'Playfair Display', family: 'Playfair Display, serif' },
    { name: 'Merriweather', family: 'Merriweather, serif' },
    { name: 'JetBrains Mono', family: 'JetBrains Mono, monospace' },
    { name: 'Outfit', family: 'Outfit, sans-serif' },
    { name: 'Space Grotesk', family: 'Space Grotesk, sans-serif' },
  ]

  const fontSizes = [
    '12px',
    '14px',
    '16px',
    '18px',
    '20px',
    '24px',
    '32px',
    '40px',
    '48px',
    '64px',
    '72px',
    '80px',
  ]

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        dropcursor: {},
        link: false,
        underline: false,
      }),
      TextStyle,
      Color,
      FontFamily,
      FontSize,
      Underline,
      TiptapLink.configure({
        openOnClick: false,
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
    ],
    []
  )

  // ── Paste handler: detect URL → auto-embed ──────────────────────────────────
  const isImageUrl = (url: string) =>
    /\.(jpe?g|png|gif|webp|avif|svg|bmp)(\?.*)?$/i.test(url)

  const isVideoUrl = (url: string) =>
    /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|mux\.com)/i.test(url)

  // ─────────────────────────────────────────────────────────────────────────────

  const editorRef = useRef<Editor | null>(null)

  const parsedContent = useMemo(() => {
    if (!value) return ''
    if (format === 'json') {
      if (typeof value === 'string') {
        try {
          return JSON.parse(value)
        } catch {
          return value
        }
      }
      return value
    }
    return value
  }, [value, format])

  // Define slashItems before useEditor to avoid temporal dead zone in handleKeyDown.
  // Action callbacks use editorRef so they work once the editor is mounted.
  const slashItems = useMemo<SlashMenuItem[]>(() => {
    const rawItems: SlashMenuItem[] = [
      {
        id: 'text',
        label: 'Paragraph',
        description: 'Start writing plain text block',
        icon: Text,
        action: () => editorRef.current?.chain().focus().setParagraph().run(),
      },
      {
        id: 'h1',
        label: 'Heading 1',
        description: 'Primary large headline structure',
        icon: Heading1,
        action: () => editorRef.current?.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2',
        label: 'Heading 2',
        description: 'Secondary section head structure',
        icon: Heading2,
        action: () => editorRef.current?.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'h3',
        label: 'Heading 3',
        description: 'Sub-section tertiary header block',
        icon: Heading3,
        action: () => editorRef.current?.chain().focus().toggleHeading({ level: 3 }).run(),
      },
      {
        id: 'bullet',
        label: 'Bullet List',
        description: 'Create a simple bulleted list',
        icon: List,
        action: () => editorRef.current?.chain().focus().toggleBulletList().run(),
      },
      {
        id: 'ordered',
        label: 'Ordered List',
        description: 'Create a sequential numbered list',
        icon: ListOrdered,
        action: () => editorRef.current?.chain().focus().toggleOrderedList().run(),
      },
      {
        id: 'quote',
        label: 'Blockquote',
        description: 'Insert a highlighted pull-quote',
        icon: Quote,
        action: () => editorRef.current?.chain().focus().toggleBlockquote().run(),
      },
      {
        id: 'clear',
        label: 'Clear Formatting',
        description: 'Erase all style marks & resets block',
        icon: Eraser,
        action: () => editorRef.current?.chain().focus().unsetAllMarks().run(),
      },
    ]

    if (!slashQuery) return rawItems
    return rawItems.filter(
      (item) =>
        item.label.toLowerCase().includes(slashQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(slashQuery.toLowerCase())
    )
  }, [slashQuery])

  const editor = useEditor({
    extensions,
    content: parsedContent || '',
    editable: !disabled,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-indigo max-w-none focus:outline-none transition-all selection:bg-indigo-500/30 leading-relaxed',
          theme === 'dark' ? 'prose-invert text-white' : 'text-black',
          mode === 'heading'
            ? 'text-5xl md:text-7xl font-black italic tracking-tighter p-0 min-h-0 uppercase leading-[0.85]'
            : mode === 'inline'
              ? 'text-2xl font-bold p-0 min-h-0 italic tracking-tight'
              : mode === 'micro'
                ? 'text-[12px] font-black uppercase tracking-[0.2em] p-2 min-h-0 italic opacity-80'
                : 'min-h-[300px] px-4 py-6 text-[16px]'
        ),
        style: `font-family: ${selectedFont}, sans-serif;`,
      },
      handlePaste: (_view, event) => {
        const pastedText = event.clipboardData?.getData('text/plain') || ''
        const trimmed = pastedText.trim()

        // Only try to auto-embed standalone URLs that look like media
        if (
          trimmed &&
          !trimmed.includes(' ') &&
          !trimmed.includes('\n') &&
          /^https?:\/\//.test(trimmed)
        ) {
          const normalizedUrl = trimmed.startsWith('https:') || trimmed.startsWith('http:')
            ? trimmed
            : `https:${trimmed}`

          if (isImageUrl(normalizedUrl) && !editor?.isDestroyed) {
            editor?.chain().focus().setImage({ src: normalizedUrl, alt: '' }).run()
            return true
          }
          if (isVideoUrl(normalizedUrl) && !editor?.isDestroyed) {
            const isYT = /youtube\.com|youtu\.be/i.test(normalizedUrl)
            const videoId = isYT
              ? (normalizedUrl.match(/(?:v=|youtu\.be\/)([A-Za-z0-9_-]{11})/)?.[1] || '')
              : ''
            // Determine the embed URL for display
            const embedLabel = isYT && videoId
              ? `▶ YouTube — youtube.com/watch?v=${videoId}`
              : `▶ Video — ${normalizedUrl}`
            editor?.chain().focus().insertContent({
              type: 'text',
              marks: [{
                type: 'link',
                attrs: { href: normalizedUrl, target: '_blank', rel: 'noopener noreferrer' },
              }],
              text: embedLabel,
            }).run()
            return true
          }
        }
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChange(format === 'json' ? editor.getJSON() : editor.getHTML())

      const { state } = editor
      const { selection } = state
      const { $from } = selection
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 20),
        $from.parentOffset,
        null,
        '\n'
      )
      const match = textBefore.match(/\/(\w*)$/)
      if (match) {
        setSlashQuery(match[1])
        setSlashMenuOpen(true)
        try {
          const coords = editor.view.coordsAtPos(selection.from)
          setSlashMenuPosition({
            top: coords.bottom + window.scrollY,
            left: coords.left + window.scrollX,
          })
        } catch (e) {
          // fallback
        }
      } else {
        setSlashMenuOpen(false)
      }
    },
    onSelectionUpdate: ({ editor }) => {
      const { state } = editor
      const { selection } = state
      const { $from } = selection
      const textBefore = $from.parent.textBetween(
        Math.max(0, $from.parentOffset - 20),
        $from.parentOffset,
        null,
        '\n'
      )
      if (!textBefore.match(/\/(\w*)$/)) {
        setSlashMenuOpen(false)
      }
    },
  })

  // Sync editorRef so slashItems actions always use the current editor instance
  useEffect(() => {
    editorRef.current = editor
  }, [editor])

  // Inject handleKeyDown separately to properly close over slashItems (avoid TDZ)
  const executeSlashCommand = useCallback((item: SlashMenuItem) => {
    if (!editor || editor.isDestroyed) return

    const { state } = editor
    const { selection } = state
    const { $from } = selection
    const textBefore = $from.parent.textBetween(
      Math.max(0, $from.parentOffset - 20),
      $from.parentOffset,
      null,
      '\n'
    )
    const match = textBefore.match(/\/(\w*)$/)
    if (match) {
      const startPos = selection.from - match[0].length
      editor.chain().focus().deleteRange({ from: startPos, to: selection.from }).run()
    }

    item.action()
    setSlashMenuOpen(false)
    setSlashSelectedIndex(0)
  }, [editor, setSlashMenuOpen, setSlashSelectedIndex])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const handler: any = (_: unknown, event: KeyboardEvent) => {
      if (slashMenuOpen) {
        if (event.key === 'ArrowDown') {
          event.preventDefault()
          setSlashSelectedIndex((prev) => (prev + 1) % slashItems.length)
          return true
        }
        if (event.key === 'ArrowUp') {
          event.preventDefault()
          setSlashSelectedIndex((prev) => (prev - 1 + slashItems.length) % slashItems.length)
          return true
        }
        if (event.key === 'Enter') {
          event.preventDefault()
          if (slashItems[slashSelectedIndex]) {
            executeSlashCommand(slashItems[slashSelectedIndex])
          }
          return true
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setSlashMenuOpen(false)
          return true
        }
      }
      if ((mode === 'heading' || mode === 'inline' || mode === 'micro') && event.key === 'Enter')
        return true
      return false
    }
    editor.setOptions({ editorProps: { handleKeyDown: handler } } as any)
  }, [editor, slashItems, slashMenuOpen, slashSelectedIndex, executeSlashCommand, mode])

  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  useEffect(() => {
    if (!editor || editor.isDestroyed) return

    if (format === 'json') {
      try {
        const currentJSON = editor.getJSON()
        // Cheap length check to avoid expensive JSON.stringify on every keystroke
        const currentLen = JSON.stringify(currentJSON).length
        const incomingStr = typeof value === 'object' ? JSON.stringify(value) : (value || '')
        if (incomingStr.length !== currentLen || incomingStr !== JSON.stringify(currentJSON)) {
          editor.commands.setContent(parsedContent || '')
        }
      } catch {
        editor.commands.setContent(parsedContent || '')
      }
    } else {
      const currentHTML = editor.getHTML()
      if ((value || '').length !== currentHTML.length || value !== currentHTML) {
        editor.commands.setContent(value || '')
      }
    }
  }, [value, editor, format, parsedContent])

  const insertImage = (url: string, alt: string) => {
    if (!editor || editor.isDestroyed) return
    const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
    ;(editor.chain().focus() as any).setImage({ src: fullUrl, alt }).run()
    setIsMediaOpen(false)
  }

  useEffect(() => {
    if (isMediaOpen) {
      const timer = setTimeout(() => {
        setLoading(true)
        api
          .get('/media')
          .then((res) => setFiles(res.data.data))
          .finally(() => setLoading(false))
      }, 0)
      return () => {
        clearTimeout(timer)
      }
    }
  }, [isMediaOpen])

  if (!editor || editor.isDestroyed) return null

  const isFull = mode === 'full'
  const isHeading = mode === 'heading'
  const isMicro = mode === 'micro'

  return (
    <div
      className={cn(
        'flex flex-col overflow-hidden transition-all duration-300 relative group',
        isFull
          ? theme === 'dark'
            ? 'bg-[#080808] border border-white/5 shadow-2xl'
            : 'bg-white border border-gray-100 shadow-xl'
          : 'bg-transparent',
        className
      )}
    >
      <AnimatePresence>
        {(isFull || (editor.isFocused && !isMicro)) && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className={cn(
              'flex items-center h-14 border-b px-4 gap-1.5 backdrop-blur-xl z-[100] transition-colors',
              isFull
                ? theme === 'dark'
                  ? 'bg-black/60 border-white/5'
                  : 'bg-white/95 border-gray-100 shadow-sm'
                : theme === 'dark'
                  ? 'bg-black/95 border-white/10 absolute -top-16 left-0 right-0 rounded-none border shadow-2xl'
                  : 'bg-white/95 border-gray-200 absolute -top-16 left-0 right-0 rounded-none border shadow-xl'
            )}
          >
            {/* Typography_Control */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFont(!showFont)
                  setShowFontSize(false)
                  setShowHeadings(false)
                  setShowColor(false)
                }}
                className={cn(
                  'flex items-center gap-4 px-4 py-2 rounded-none hover:bg-indigo-500/10 transition-all min-w-[140px] justify-between group/ctrl',
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
              >
                <span className="text-[11px] font-black uppercase italic truncate tracking-tight">
                  {selectedFont}
                </span>
                <ChevronDown
                  size={12}
                  className="opacity-40 group-hover/ctrl:opacity-100 transition-opacity"
                />
              </button>
              <AnimatePresence>
                {showFont && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={cn(
                      'absolute top-full left-0 mt-2 z-[600] border shadow-[0_40px_80px_rgba(0,0,0,0.6)] p-1 min-w-[200px] backdrop-blur-3xl',
                      theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-gray-200'
                    )}
                  >
                    <div className="px-4 py-2 border-b border-white/5 mb-1">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-gray-500 italic">
                        Font Family
                      </span>
                    </div>
                    {fonts.map((f) => (
                      <button
                        key={f.name}
                        onClick={() => {
                          setSelectedFont(f.name)
                          editor.chain().focus().setFontFamily(f.family).run()
                          setShowFont(false)
                        }}
                        className={cn(
                          'w-full text-left px-5 py-3 text-[11px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between group',
                          selectedFont === f.name && 'text-indigo-500'
                        )}
                        style={{ fontFamily: f.family }}
                      >
                        {f.name}
                        {selectedFont === f.name && <Check size={10} />}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1.5" />

            {/* Size_Control */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowFontSize(!showFontSize)
                  setShowFont(false)
                  setShowHeadings(false)
                  setShowColor(false)
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-none hover:bg-indigo-500/10 transition-all group/ctrl',
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
              >
                <LetterText size={18} />
                <ChevronDown
                  size={12}
                  className="opacity-40 group-hover/ctrl:opacity-100 transition-opacity"
                />
              </button>
              <AnimatePresence>
                {showFontSize && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={cn(
                      'absolute top-full left-0 mt-2 z-[600] border shadow-[0_40px_80px_rgba(0,0,0,0.6)] p-2 grid grid-cols-4 gap-1 min-w-[200px] backdrop-blur-3xl',
                      theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-gray-200'
                    )}
                  >
                    {fontSizes.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          ;(editor.chain().focus() as any).setFontSize(s).run()
                          setShowFontSize(false)
                        }}
                        className="px-2 py-3 text-[10px] font-black hover:bg-indigo-600 hover:text-white transition-all border border-white/5 text-center"
                      >
                        {s.replace('px', '')}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1.5" />

            {/* Heading_Control */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowHeadings(!showHeadings)
                  setShowFont(false)
                  setShowFontSize(false)
                  setShowColor(false)
                }}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-none hover:bg-indigo-500/10 transition-all group/ctrl',
                  theme === 'dark' ? 'text-white' : 'text-black'
                )}
              >
                <span className="text-[11px] font-black uppercase italic tracking-tight">
                  Structure
                </span>
                <ChevronDown
                  size={12}
                  className="opacity-40 group-hover/ctrl:opacity-100 transition-opacity"
                />
              </button>
              <AnimatePresence>
                {showHeadings && (
                  <motion.div
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 5 }}
                    className={cn(
                      'absolute top-full left-0 mt-2 z-[600] border shadow-[0_40px_80px_rgba(0,0,0,0.6)] p-1 min-w-[160px] backdrop-blur-3xl',
                      theme === 'dark' ? 'bg-black border-white/10' : 'bg-white border-gray-200'
                    )}
                  >
                    <button
                      onClick={() => {
                        editor.chain().focus().setParagraph().run()
                        setShowHeadings(false)
                      }}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between"
                    >
                      Paragraph {editor.isActive('paragraph') && <Check size={10} />}
                    </button>
                    <button
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 1 }).run()
                        setShowHeadings(false)
                      }}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between"
                    >
                      H1 Primary {editor.isActive('heading', { level: 1 }) && <Check size={10} />}
                    </button>
                    <button
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 2 }).run()
                        setShowHeadings(false)
                      }}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between"
                    >
                      H2 Secondary {editor.isActive('heading', { level: 2 }) && <Check size={10} />}
                    </button>
                    <button
                      onClick={() => {
                        editor.chain().focus().toggleHeading({ level: 3 }).run()
                        setShowHeadings(false)
                      }}
                      className="w-full text-left px-5 py-3 text-[10px] font-black uppercase italic hover:bg-indigo-600 hover:text-white transition-all flex items-center justify-between"
                    >
                      H3 Tertiary {editor.isActive('heading', { level: 3 }) && <Check size={10} />}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <div className="w-px h-6 bg-white/10 mx-1.5" />

            <ToolBtn
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              title="Bold"
            >
              <Bold size={18} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              title="Italic"
            >
              <Italic size={18} />
            </ToolBtn>
            <ToolBtn
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              title="Underline"
            >
              <UnderlineIcon size={18} />
            </ToolBtn>

            <div className="relative">
              <ToolBtn
                onClick={() => {
                  setShowColor(!showColor)
                  setShowFont(false)
                  setShowFontSize(false)
                  setShowHeadings(false)
                }}
                isActive={showColor}
                title="Text Color"
              >
                <Palette size={18} />
              </ToolBtn>
              <AnimatePresence>
                {showColor && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 10 }}
                    className="absolute top-full left-0 mt-2 z-[500]"
                  >
                    <ColorPicker
                      onSelect={(c) => {
                        editor.chain().focus().setColor(c).run()
                        setShowColor(false)
                      }}
                      activeColor={editor.getAttributes('textStyle').color}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <ToolBtn
              onClick={() => editor.chain().focus().unsetAllMarks().run()}
              title="Clear Formatting"
            >
              <Eraser size={18} />
            </ToolBtn>

            {isFull && (
              <>
                <div className="w-px h-6 bg-white/10 mx-1.5" />
                <ToolBtn
                  onClick={() => editor.chain().focus().toggleBulletList().run()}
                  isActive={editor.isActive('bulletList')}
                  title="Bullet List"
                >
                  <List size={18} />
                </ToolBtn>
                <ToolBtn onClick={() => setIsMediaOpen(true)} title="Insert Image">
                  <ImageIcon size={18} />
                </ToolBtn>
                <ToolBtn
                  onClick={() => {
                    const url = window.prompt('URL')
                    if (url) editor.chain().focus().setLink({ href: url }).run()
                  }}
                  isActive={editor.isActive('link')}
                  title="Insert Link"
                >
                  <LinkIcon size={18} />
                </ToolBtn>
              </>
            )}

          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'flex-1 overflow-visible flex flex-col transition-all duration-300',
          isFull ? (theme === 'dark' ? 'bg-[#050505]' : 'bg-white') : 'bg-transparent'
        )}
      >
        <div
          className={cn(
            'w-full transition-all duration-500',
            isFull ? 'max-w-[1000px] mx-auto py-4 px-4' : 'max-w-none p-0'
          )}
        >
          {editor && (
            <BubbleMenu
              editor={editor}
              shouldShow={({ from, to }: { from: number; to: number }) => {
                return from !== to && !slashMenuOpen
              }}
            >
              <div
                className={cn(
                  'flex items-center h-10 border px-1 gap-0.5 backdrop-blur-xl shadow-xl z-[1500] rounded-none',
                  theme === 'dark'
                    ? 'bg-black/90 border-white/10 text-white'
                    : 'bg-white border-gray-200 text-black'
                )}
              >
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={cn(
                    'w-8 h-8 rounded-none transition-colors flex items-center justify-center hover:bg-white/5',
                    editor.isActive('bold')
                      ? theme === 'dark'
                        ? 'text-indigo-400 bg-white/5'
                        : 'text-indigo-600 bg-gray-100'
                      : 'text-gray-400'
                  )}
                >
                  <Bold size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={cn(
                    'w-8 h-8 rounded-none transition-colors flex items-center justify-center hover:bg-white/5',
                    editor.isActive('italic')
                      ? theme === 'dark'
                        ? 'text-indigo-400 bg-white/5'
                        : 'text-indigo-600 bg-gray-100'
                      : 'text-gray-400'
                  )}
                >
                  <Italic size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().toggleUnderline().run()}
                  className={cn(
                    'w-8 h-8 rounded-none transition-colors flex items-center justify-center hover:bg-white/5',
                    editor.isActive('underline')
                      ? theme === 'dark'
                        ? 'text-indigo-400 bg-white/5'
                        : 'text-indigo-600 bg-gray-100'
                      : 'text-gray-400'
                  )}
                >
                  <UnderlineIcon size={14} />
                </button>
                <div className="w-px h-4 bg-white/10 mx-1" />
                <button
                  type="button"
                  onClick={() => {
                    const url = window.prompt('URL')
                    if (url) editor.chain().focus().setLink({ href: url }).run()
                  }}
                  className={cn(
                    'w-8 h-8 rounded-none transition-colors flex items-center justify-center hover:bg-white/5',
                    editor.isActive('link')
                      ? theme === 'dark'
                        ? 'text-indigo-400 bg-white/5'
                        : 'text-indigo-600 bg-gray-100'
                      : 'text-gray-400'
                  )}
                >
                  <LinkIcon size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => editor.chain().focus().unsetAllMarks().run()}
                  className="w-8 h-8 rounded-none text-gray-400 hover:text-white transition-colors flex items-center justify-center hover:bg-white/5"
                  title="Clear Formatting"
                >
                  <Eraser size={14} />
                </button>
              </div>
            </BubbleMenu>
          )}

          {slashMenuOpen && (
            <SlashMenu
              position={slashMenuPosition}
              selectedIndex={slashSelectedIndex}
              items={slashItems}
              onSelectItem={(idx) => {
                if (slashItems[idx]) {
                  executeSlashCommand(slashItems[idx])
                }
              }}
              theme={theme}
            />
          )}

          <EditorContent
            editor={editor}
            className={cn('relative z-10', isHeading && 'leading-[0.85]')}
          />
        </div>
      </div>

      <AnimatePresence>
        {isMediaOpen && (
          <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                'rounded-none w-full max-w-5xl h-[80vh] flex flex-col overflow-hidden shadow-2xl border',
                theme === 'dark' ? 'bg-[#050505] border-white/10' : 'bg-white border-gray-100'
              )}
            >
              <div className="p-8 border-b border-white/5 flex items-center justify-between">
                <h3
                  className={cn(
                    'text-2xl font-black uppercase italic',
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  )}
                >
                  Media Library
                </h3>
                <button
                  onClick={() => setIsMediaOpen(false)}
                  className="p-2 border hover:bg-rose-500 hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-8 grid grid-cols-2 md:grid-cols-4 gap-6 no-scrollbar">
                {loading ? (
                  <div className="col-span-full h-full flex items-center justify-center py-20">
                    <Loader2 className="animate-spin text-indigo-500" />
                  </div>
                ) : (
                  files.map((file) => (
                    <div
                      key={file._id}
                      onClick={() => insertImage(file.url, file.alt || '')}
                      className="aspect-square border border-white/5 cursor-pointer relative group overflow-hidden"
                    >
                      <img
                        src={file.url}
                        className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                        alt=""
                      />
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default RichTextEditor
