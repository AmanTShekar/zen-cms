/* eslint-disable react-hooks/refs */
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  COMMAND_PRIORITY_EDITOR,
  FORMAT_TEXT_COMMAND,
  createCommand,
  $isTextNode,
  type LexicalCommand,
} from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { $createListItemNode, $createListNode } from '@lexical/list'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $insertNodeToNearestRoot } from '@lexical/utils'
import { $createTableNode, $createTableRowNode, $createTableCellNode, TableCellHeaderStates } from '@lexical/table'
import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { createPortal } from 'react-dom'
import {
  Type,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Code,
  Image,
  Link,
  Minus,
  Eraser,
  Table,
} from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useTheme } from '../../../context/ThemeContext'
import { $createHorizontalRuleNode } from '../nodes/HorizontalRuleNode'
import { $createImageNode, $isImageNode } from '../nodes/ImageNode'
import { $getNodeByKey, type NodeKey } from 'lexical'

/** Strips the trailing "/..." text that triggered the slash menu */
function $removeSlashQuery() {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return
  const anchor = selection.anchor
  const anchorNode = anchor.getNode()
  const text = anchorNode.getTextContent()
  const offset = anchor.offset
  const before = text.slice(0, offset)
  const match = before.match(/\/[\w-]*$/)
  if (match) {
    const start = offset - match[0].length
    if ($isTextNode(anchorNode)) {
      anchorNode.spliceText(start, match[0].length, '', true)
    }
  }
}

export interface SlashCommandItem {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ size?: number }>
  keywords?: string[]
  action: () => void
}

export const SLASH_COMMAND: LexicalCommand<{ query: string }> = createCommand('SLASH_COMMAND')

export function SlashCommandPlugin() {
  const [editor] = useLexicalComposerContext()
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const menuRef = useRef<HTMLDivElement>(null)
  const pendingImageKey = useRef<NodeKey | null>(null)

  // Listen for media selection from the media library modal
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (!detail?.url || !pendingImageKey.current) return
      editor.update(() => {
        const node = $getNodeByKey(pendingImageKey.current!)
        if ($isImageNode(node)) {
          const writable = node.getWritable()
          ;(writable as any).__src = detail.url
          if (detail.alt) writable.setAlt(detail.alt)
          if (detail.width) (writable as any).__width = detail.width
          if (detail.height) (writable as any).__height = detail.height
        }
      })
      pendingImageKey.current = null
    }
    window.addEventListener('zenith:media-selected', handler)
    return () => window.removeEventListener('zenith:media-selected', handler)
  }, [editor])

  const commands = useCallback((): SlashCommandItem[] => {
    return [
      {
        id: 'paragraph',
        label: 'Paragraph',
        description: 'Plain text block',
        icon: Type,
        keywords: ['text', 'p', 'paragraph'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const nodes = selection.getNodes()
            for (const node of nodes) {
              const topLevel = node.getTopLevelElement()
              if (topLevel && topLevel.getType() !== 'paragraph') {
                const paragraph = $createParagraphNode()
                topLevel.replace(paragraph)
                paragraph.select()
              }
            }
            if (nodes.length === 0) {
              const paragraph = $createParagraphNode()
              selection.insertNodes([paragraph])
            }
          })
        },
      },
      {
        id: 'h1',
        label: 'Heading 1',
        description: 'Large section heading',
        icon: Heading1,
        keywords: ['heading', 'h1', 'title', 'large'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const focusNode = selection.focus.getNode()
            const element = focusNode.getTopLevelElement()
            const heading = $createHeadingNode('h1')
            if (element) {
              element.replace(heading)
            } else {
              selection.insertNodes([heading])
            }
            heading.select()
          })
        },
      },
      {
        id: 'h2',
        label: 'Heading 2',
        description: 'Medium section heading',
        icon: Heading2,
        keywords: ['heading', 'h2', 'subtitle', 'medium'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const focusNode = selection.focus.getNode()
            const element = focusNode.getTopLevelElement()
            const heading = $createHeadingNode('h2')
            if (element) {
              element.replace(heading)
            } else {
              selection.insertNodes([heading])
            }
            heading.select()
          })
        },
      },
      {
        id: 'h3',
        label: 'Heading 3',
        description: 'Small section heading',
        icon: Heading3,
        keywords: ['heading', 'h3', 'subheading', 'small'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const focusNode = selection.focus.getNode()
            const element = focusNode.getTopLevelElement()
            const heading = $createHeadingNode('h3')
            if (element) {
              element.replace(heading)
            } else {
              selection.insertNodes([heading])
            }
            heading.select()
          })
        },
      },
      {
        id: 'bullet-list',
        label: 'Bullet List',
        description: 'Unordered list with bullets',
        icon: List,
        keywords: ['ul', 'bullet', 'list', 'unordered'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const list = $createListNode('bullet')
            const item = $createListItemNode()
            list.append(item)
            item.append($createParagraphNode())
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const element = selection.anchor.getNode().getTopLevelElement()
              if (element) {
                element.replace(list)
              } else {
                selection.insertNodes([list])
              }
            }
            const firstChild = item.getFirstChild()
            if (firstChild) firstChild.selectStart()
          })
        },
      },
      {
        id: 'ordered-list',
        label: 'Numbered List',
        description: 'Ordered list with numbers',
        icon: ListOrdered,
        keywords: ['ol', 'ordered', 'list', 'numbered', 'sequence'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const list = $createListNode('number')
            const item = $createListItemNode()
            list.append(item)
            item.append($createParagraphNode())
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              const element = selection.anchor.getNode().getTopLevelElement()
              if (element) {
                element.replace(list)
              } else {
                selection.insertNodes([list])
              }
            }
            const firstChild = item.getFirstChild()
            if (firstChild) firstChild.selectStart()
          })
        },
      },
      {
        id: 'quote',
        label: 'Blockquote',
        description: 'Highlighted quotation block',
        icon: Quote,
        keywords: ['quote', 'blockquote', 'citation', 'pull-quote'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            const element = selection.anchor.getNode().getTopLevelElement()
            const quote = $createQuoteNode()
            if (element) {
              element.replace(quote)
            } else {
              selection.insertNodes([quote])
            }
            quote.select()
          })
        },
      },
      {
        id: 'code',
        label: 'Code Block',
        description: 'Code snippet with syntax highlighting',
        icon: Code,
        keywords: ['code', 'snippet', 'pre', 'programming'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const codeNode = $createCodeNode()
            $insertNodeToNearestRoot(codeNode)
            codeNode.select()
          })
        },
      },
      {
        id: 'divider',
        label: 'Divider',
        description: 'Horizontal rule separator',
        icon: Minus,
        keywords: ['divider', 'hr', 'line', 'separator', 'rule', 'break'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              selection.insertNodes([$createHorizontalRuleNode()])
            }
          })
        },
      },
      {
        id: 'image',
        label: 'Image',
        description: 'Embed an image from media library',
        icon: Image,
        keywords: ['image', 'photo', 'picture', 'media', 'upload'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const imageNode = $createImageNode({ alt: '', src: '' })
            pendingImageKey.current = imageNode.getKey()
            const selection = $getSelection()
            if ($isRangeSelection(selection)) {
              selection.insertNodes([imageNode])
            }
          })
          window.dispatchEvent(new CustomEvent('zenith:open-media-picker'))
        },
      },
      {
        id: 'link',
        label: 'Link',
        description: 'Insert a hyperlink',
        icon: Link,
        keywords: ['link', 'url', 'href', 'anchor', 'hyperlink'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
          })
          editor.dispatchCommand(TOGGLE_LINK_COMMAND, 'https://')
        },
      },
      {
        id: 'table',
        label: 'Table',
        description: 'Insert a data table',
        icon: Table,
        keywords: ['table', 'grid', 'data', 'spreadsheet'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const table = $createTableNode()
            for (let r = 0; r < 3; r++) {
              const row = $createTableRowNode()
              for (let c = 0; c < 3; c++) {
                const cell = $createTableCellNode(r === 0 ? TableCellHeaderStates.ROW : TableCellHeaderStates.NO_STATUS)
                cell.append($createParagraphNode())
                row.append(cell)
              }
              table.append(row)
            }
            $insertNodeToNearestRoot(table)
          })
        },
      },
      {
        id: 'clear',
        label: 'Clear Formatting',
        description: 'Remove all formatting marks',
        icon: Eraser,
        keywords: ['clear', 'reset', 'clean', 'format', 'remove'],
        action: () => {
          editor.update(() => {
            $removeSlashQuery()
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
            const element = selection.anchor.getNode().getTopLevelElement()
            if (element && element.getType() !== 'paragraph') {
              const paragraph = $createParagraphNode()
              element.replace(paragraph)
              paragraph.select()
            }
          })
        },
      },
    ]
  }, [editor])

  const allCommands = useMemo(() => commands(), [editor])
  const filteredCommands = useMemo(() => {
    if (!query) return allCommands
    const q = query.toLowerCase()
    return allCommands.filter(
      (cmd) =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.description.toLowerCase().includes(q) ||
        cmd.keywords?.some((kw) => kw.toLowerCase().includes(q)),
    )
  }, [allCommands, query])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action()
          setIsOpen(false)
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, filteredCommands, selectedIndex])

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection()
        if (!$isRangeSelection(selection)) {
          setIsOpen(false)
          return
        }

        const anchor = selection.anchor
        const focus = selection.focus

        if (anchor.key !== focus.key || anchor.offset !== focus.offset) {
          setIsOpen(false)
          return
        }

        const anchorNode = anchor.getNode()
        const textContent = anchorNode.getTextContent()
        const offset = anchor.offset

        const textBefore = textContent.slice(0, offset)
        const match = textBefore.match(/\/([\w-]*)$/)

        if (match) {
          setQuery(match[1])
          setIsOpen(true)
          setSelectedIndex(0)

          const domSelection = window.getSelection()
          if (domSelection && domSelection.rangeCount > 0) {
            const range = domSelection.getRangeAt(0)
            const rect = range.getBoundingClientRect()
            setPosition({
              top: rect.bottom + window.scrollY + 4,
              left: rect.left + window.scrollX,
            })
          }
        } else {
          setIsOpen(false)
        }
      })
    })
  }, [editor])

  if (!isOpen || filteredCommands.length === 0) return null

  return createPortal(
    <div
      ref={menuRef}
      className={cn(
        'fixed z-[2500] w-72 max-h-[360px] overflow-y-auto border shadow-2xl backdrop-blur-2xl',
        theme === 'dark'
          ? 'bg-[#0b0f19]/95 border-white/10 shadow-[0_20px_60px_rgba(0,0,0,0.6)]'
          : 'bg-white/95 border-gray-200 shadow-[0_20px_60px_rgba(0,0,0,0.15)]',
      )}
      style={{ top: position.top, left: position.left }}
    >
      <div
        className={cn(
          'px-3 py-2 border-b flex items-center justify-between',
          theme === 'dark' ? 'border-white/5' : 'border-gray-100',
        )}
      >
        <span
          className={cn(
            'text-[8px] font-black uppercase tracking-[0.2em] italic',
            theme === 'dark' ? 'text-gray-500' : 'text-gray-400',
          )}
        >
          Block Command
        </span>
        <span
          className={cn(
            'text-[7px] font-bold px-1.5 py-0.5 border rounded-none uppercase',
            theme === 'dark'
              ? 'text-emerald-400 border-emerald-500/20'
              : 'text-emerald-500 border-emerald-200',
          )}
        >
          ↑↓ Enter
        </span>
      </div>
      <div className="p-1">
        {filteredCommands.map((cmd, index) => {
          const Icon = cmd.icon
          const isSelected = index === selectedIndex

          return (
            <button
              key={cmd.id}
              onClick={() => {
                cmd.action()
                setIsOpen(false)
              }}
              className={cn(
                'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all duration-100 relative',
                isSelected
                  ? theme === 'dark'
                    ? 'bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-500'
                    : 'bg-emerald-50 text-emerald-600 border-l-2 border-emerald-500'
                  : 'border-l-2 border-transparent hover:bg-white/5',
              )}
            >
              <div
                className={cn(
                  'w-7 h-7 rounded-none flex items-center justify-center border shrink-0',
                  isSelected
                    ? theme === 'dark'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-emerald-100 border-emerald-200 text-emerald-600'
                    : theme === 'dark'
                      ? 'bg-white/5 border-white/5 text-gray-400'
                      : 'bg-gray-100 border-gray-200 text-gray-500',
                )}
              >
                <Icon size={14} />
              </div>
              <div className="flex flex-col min-w-0">
                <span
                  className={cn(
                    'text-[11px] font-black uppercase tracking-tight italic',
                    theme === 'dark' ? 'text-white' : 'text-gray-900',
                  )}
                >
                  {cmd.label}
                </span>
                <span
                  className={cn(
                    'text-[10px] leading-tight truncate mt-0.5',
                    theme === 'dark' ? 'text-gray-500' : 'text-gray-400',
                  )}
                >
                  {cmd.description}
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>,
    document.body,
  )
}
