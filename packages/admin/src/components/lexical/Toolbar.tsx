import React, { useCallback, useState } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  COMMAND_PRIORITY_CRITICAL,
  CAN_REDO_COMMAND,
  CAN_UNDO_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
} from 'lexical'
import { $wrapNodes } from '@lexical/selection'
import { $getNearestNodeOfType, mergeRegister } from '@lexical/utils'
import {
  ListNode,
  $isListNode,
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
} from '@lexical/list'
import { $createHeadingNode, $isHeadingNode } from '@lexical/rich-text'
import { $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode, $isCodeNode } from '@lexical/code'
import { TOGGLE_LINK_COMMAND } from '@lexical/link'
import { $isTableNode } from '@lexical/table'
import { $isLinkNode } from '@lexical/link'
import { $createHorizontalRuleNode } from './nodes/HorizontalRuleNode'
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Code,
  Link,
  Undo2,
  Redo2,
  List,
  ListOrdered,
  Quote,
  Minus,
  Eraser,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { useTheme } from '../../context/ThemeContext'

interface ToolbarButtonProps {
  onClick: () => void
  isActive?: boolean
  disabled?: boolean
  title: string
  children: React.ReactElement
}

function ToolbarButton({ onClick, isActive, disabled, title, children }: ToolbarButtonProps) {
  const { theme } = useTheme()
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-9 h-9 flex items-center justify-center transition-all relative active:scale-90',
        isActive
          ? theme === 'dark'
            ? 'bg-emerald-500/20 text-emerald-400'
            : 'bg-emerald-50 text-emerald-600'
          : theme === 'dark'
            ? 'text-gray-500 hover:bg-white/5 hover:text-white'
            : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900',
        disabled && 'opacity-30 pointer-events-none',
      )}
    >
      {React.cloneElement(children as React.ReactElement<any>, { size: 16 })}
    </button>
  )
}

function Divider() {
  const { theme } = useTheme()
  return (
    <div className={cn('w-px h-6 mx-1', theme === 'dark' ? 'bg-white/10' : 'bg-gray-200')} />
  )
}

function BlockTypeDropdown({ blockType, onBlockTypeChange }: {
  blockType: string
  onBlockTypeChange: (type: string) => void
}) {
  const { theme } = useTheme()
  const [isOpen, setIsOpen] = useState(false)

  const blockOptions = [
    { value: 'paragraph', label: 'Paragraph' },
    { value: 'h1', label: 'Heading 1' },
    { value: 'h2', label: 'Heading 2' },
    { value: 'h3', label: 'Heading 3' },
    { value: 'quote', label: 'Quote' },
    { value: 'code', label: 'Code' },
  ]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex items-center gap-2 px-3 py-1.5 text-[11px] font-black uppercase italic tracking-tight transition-all',
          theme === 'dark'
            ? 'text-white hover:bg-white/5'
            : 'text-gray-900 hover:bg-gray-100',
        )}
      >
        {blockOptions.find((o) => o.value === blockType)?.label || 'Paragraph'}
        <svg width="8" height="5" viewBox="0 0 8 5" className="opacity-50">
          <path d="M0 0L4 5L8 0" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 5 }}
            className={cn(
              'absolute top-full left-0 mt-1 z-[600] border shadow-[0_20px_60px_rgba(0,0,0,0.4)] p-1 min-w-[160px]',
              theme === 'dark'
                ? 'bg-[#0b0f19]/95 border-white/[0.08] backdrop-blur-2xl'
                : 'bg-white border-gray-200 shadow-xl',
            )}
          >
            {blockOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onBlockTypeChange(opt.value)
                  setIsOpen(false)
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-[10px] font-black uppercase italic transition-all',
                  blockType === opt.value
                    ? theme === 'dark'
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-emerald-600 bg-emerald-50'
                    : theme === 'dark'
                      ? 'text-gray-400 hover:bg-white/5 hover:text-white'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                )}
              >
                {opt.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Toolbar({ disabled }: { disabled?: boolean }) {
  const [editor] = useLexicalComposerContext()
  const { theme } = useTheme()
  const [activeEditor, setActiveEditor] = useState(editor)
  const [isBold, setIsBold] = useState(false)
  const [isItalic, setIsItalic] = useState(false)
  const [isUnderline, setIsUnderline] = useState(false)
  const [isStrikethrough, setIsStrikethrough] = useState(false)
  const [isCode, setIsCode] = useState(false)
  const [isLink, setIsLink] = useState(false)
  const [blockType, setBlockType] = useState<string>('paragraph')
  const [canUndo, setCanUndo] = useState(false)
  const [canRedo, setCanRedo] = useState(false)

  const updateToolbar = useCallback(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'))
      setIsItalic(selection.hasFormat('italic'))
      setIsUnderline(selection.hasFormat('underline'))
      setIsStrikethrough(selection.hasFormat('strikethrough'))
      setIsCode(selection.hasFormat('code'))

      const anchorNode = selection.anchor.getNode()
      const element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : anchorNode.getTopLevelElementOrThrow()
      const elementKey = element.getKey()
      const elementDOM = activeEditor.getElementByKey(elementKey)

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $getNearestNodeOfType(anchorNode, ListNode)
          const type = parentList ? parentList.getListType() : (element as ListNode).getListType()
          setBlockType(type === 'bullet' ? 'ul' : 'ol')
        } else if ($isHeadingNode(element)) {
          setBlockType(element.getTag())
        } else if ($isCodeNode(element)) {
          setBlockType('code')
        } else if ($isTableNode(element)) {
          setBlockType('table')
        } else {
          setBlockType(element.getType())
        }
      }

      const node = selection.anchor.getNode()
      const parent = node.getParent()
      setIsLink($isLinkNode(parent) || $isLinkNode(node))
    }
  }, [activeEditor])

  React.useEffect(() => {
    return mergeRegister(
      activeEditor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar()
        })
      }),
      activeEditor.registerCommand(
        SELECTION_CHANGE_COMMAND,
        () => {
          updateToolbar()
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
      activeEditor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload)
          return false
        },
        COMMAND_PRIORITY_CRITICAL,
      ),
    )
  }, [activeEditor, updateToolbar])

  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = window.prompt('Enter URL:')
      if (url) {
        activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, url)
      }
    } else {
      activeEditor.dispatchCommand(TOGGLE_LINK_COMMAND, null)
    }
  }, [activeEditor, isLink])

  const insertDivider = useCallback(() => {
    activeEditor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        selection.insertNodes([$createHorizontalRuleNode()])
      }
    })
  }, [activeEditor])

  const clearFormatting = useCallback(() => {
    activeEditor.update(() => {
      const selection = $getSelection()
      if ($isRangeSelection(selection)) {
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')
        activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')
      }
    })
  }, [activeEditor])

  return (
    <div
      className={cn(
        'flex items-center h-12 border-b px-3 gap-0.5 backdrop-blur-xl z-[100] flex-wrap',
        theme === 'dark'
          ? 'bg-[#0B0F19]/60 border-white/[0.08]'
          : 'bg-white/95 border-gray-100 shadow-sm',
        disabled && 'opacity-50 pointer-events-none',
      )}
    >
      {/* Undo / Redo */}
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(UNDO_COMMAND, undefined)}
        disabled={!canUndo}
        title="Undo"
      >
        <Undo2 />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(REDO_COMMAND, undefined)}
        disabled={!canRedo}
        title="Redo"
      >
        <Redo2 />
      </ToolbarButton>

      <Divider />

      {/* Block type */}
      <BlockTypeDropdown
        blockType={blockType}
        onBlockTypeChange={(type) => {
          activeEditor.update(() => {
            const selection = $getSelection()
            if (!$isRangeSelection(selection)) return
            if (type === 'paragraph') {
              $wrapNodes(selection, () => $createParagraphNode())
            } else if (type === 'h1') {
              $wrapNodes(selection, () => $createHeadingNode('h1'))
            } else if (type === 'h2') {
              $wrapNodes(selection, () => $createHeadingNode('h2'))
            } else if (type === 'h3') {
              $wrapNodes(selection, () => $createHeadingNode('h3'))
            } else if (type === 'quote') {
              $wrapNodes(selection, () => $createQuoteNode())
            } else if (type === 'code') {
              $wrapNodes(selection, () => $createCodeNode())
            }
          })
          setBlockType(type)
        }}
      />

      <Divider />

      {/* Inline formatting */}
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')}
        isActive={isBold}
        title="Bold (Ctrl+B)"
      >
        <Bold />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')}
        isActive={isItalic}
        title="Italic (Ctrl+I)"
      >
        <Italic />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')}
        isActive={isUnderline}
        title="Underline (Ctrl+U)"
      >
        <Underline />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')}
        isActive={isStrikethrough}
        title="Strikethrough"
      >
        <Strikethrough />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code')}
        isActive={isCode}
        title="Inline Code"
      >
        <Code />
      </ToolbarButton>

      <Divider />

      {/* Lists */}
      <ToolbarButton
        onClick={() => {
          if (blockType === 'ul') {
            activeEditor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            setBlockType('paragraph')
          } else {
            activeEditor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)
            setBlockType('ul')
          }
        }}
        isActive={blockType === 'ul'}
        title="Bullet List"
      >
        <List />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => {
          if (blockType === 'ol') {
            activeEditor.dispatchCommand(REMOVE_LIST_COMMAND, undefined)
            setBlockType('paragraph')
          } else {
            activeEditor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)
            setBlockType('ol')
          }
        }}
        isActive={blockType === 'ol'}
        title="Numbered List"
      >
        <ListOrdered />
      </ToolbarButton>

      <Divider />

      {/* Link */}
      <ToolbarButton onClick={insertLink} isActive={isLink} title="Insert Link">
        <Link />
      </ToolbarButton>

      {/* Divider */}
      <ToolbarButton onClick={insertDivider} title="Horizontal Divider">
        <Minus />
      </ToolbarButton>

      {/* Clear formatting */}
      <ToolbarButton onClick={clearFormatting} title="Clear Formatting">
        <Eraser />
      </ToolbarButton>
    </div>
  )
}

export default Toolbar
