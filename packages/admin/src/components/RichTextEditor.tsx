import React, { useEffect, useState, useMemo } from 'react'
import { useEditor, EditorContent, Extension } from '@tiptap/react'
// BubbleMenu and FloatingMenu removed as they were unused
import { StarterKit } from '@tiptap/starter-kit'
import { Underline } from '@tiptap/extension-underline'
import { TextStyle } from '@tiptap/extension-text-style'
import { Color } from '@tiptap/extension-color'
import { FontFamily } from '@tiptap/extension-font-family'
import { Link as TiptapLink } from '@tiptap/extension-link'
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
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../lib/utils'
import api from '../lib/api'
import { useTheme } from '../context/ThemeContext'

// Custom_FontSize_Extension
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
    ],
    []
  )

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
      handleKeyDown: (_, event) => {
        if ((mode === 'heading' || mode === 'inline' || mode === 'micro') && event.key === 'Enter')
          return true
        return false
      },
    },
    onUpdate: ({ editor }) => {
      onChange(format === 'json' ? editor.getJSON() : editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor) {
      editor.setEditable(!disabled)
    }
  }, [editor, disabled])

  useEffect(() => {
    if (!editor) return

    let currentContent: any
    if (format === 'json') {
      currentContent = JSON.stringify(editor.getJSON())
      const incomingString = typeof value === 'object' ? JSON.stringify(value) : value
      if (incomingString !== currentContent) {
        editor.commands.setContent(parsedContent || '')
      }
    } else {
      currentContent = editor.getHTML()
      if (value !== currentContent) {
        editor.commands.setContent(value || '')
      }
    }
  }, [value, editor, format, parsedContent])

  const insertImage = (url: string, alt: string) => {
    const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url}`
    ;(editor?.chain().focus() as any).setImage({ src: fullUrl, alt }).run()
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

  if (!editor) return null

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
