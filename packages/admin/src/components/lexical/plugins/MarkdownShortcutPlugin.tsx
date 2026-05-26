import { useEffect } from 'react'
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext'
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  KEY_DOWN_COMMAND,
  COMMAND_PRIORITY_HIGH,
  type ElementNode,
  type LexicalNode,
} from 'lexical'
import { $createHeadingNode, $createQuoteNode } from '@lexical/rich-text'
import { $createCodeNode } from '@lexical/code'
import { $createListItemNode, $createListNode } from '@lexical/list'
import { $createHorizontalRuleNode } from '../nodes/HorizontalRuleNode'
import { $insertNodeToNearestRoot } from '@lexical/utils'

/**
 * MarkdownShortcutPlugin — converts common markdown shortcuts into Lexical nodes:
 *   # text  → Heading 1
 *   ## text → Heading 2
 *   ### text → Heading 3
 *   > text  → Blockquote
 *   - text  → Bullet list
 *   * text  → Bullet list
 *   1. text → Ordered list
 *   ---     → Horizontal rule
 *   ```     → Code block
 */
export function MarkdownShortcutPlugin() {
  const [editor] = useLexicalComposerContext()

  useEffect(() => {
    return editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if (event.key !== ' ' && event.key !== 'Enter') return false

        let handled = false

        editor.update(() => {
          const selection = $getSelection()
          if (!$isRangeSelection(selection)) return

          const anchorNode = selection.anchor.getNode()
          const textContent = anchorNode.getTextContent()
          const offset = selection.anchor.offset
          const textBefore = textContent.slice(0, offset)

          if (event.key === ' ') {
            if (textBefore === '#') {
              replaceWithBlock(anchorNode, $createHeadingNode('h1'), 1)
              handled = true
            } else if (textBefore === '##') {
              replaceWithBlock(anchorNode, $createHeadingNode('h2'), 2)
              handled = true
            } else if (textBefore === '###') {
              replaceWithBlock(anchorNode, $createHeadingNode('h3'), 3)
              handled = true
            } else if (textBefore === '>') {
              replaceWithBlock(anchorNode, $createQuoteNode(), 1)
              handled = true
            } else if (textBefore === '-' || textBefore === '*') {
              replaceWithList(anchorNode, 'bullet', 1)
              handled = true
            } else if (/^\d+\.$/.test(textBefore)) {
              replaceWithList(anchorNode, 'number', textBefore.length)
              handled = true
            } else if (textBefore === '```') {
              const code = $createCodeNode()
              const parent = anchorNode.getParent()
              if (parent) {
                parent.replace(code)
                code.select()
              }
              handled = true
            }
          } else if (event.key === 'Enter') {
            if (textBefore === '---') {
              anchorNode.remove()
              $insertNodeToNearestRoot($createHorizontalRuleNode())
              handled = true
            }
          }
        })

        if (handled) {
          event.preventDefault()
          return true
        }
        return false
      },
      COMMAND_PRIORITY_HIGH,
    )
  }, [editor])

  return null
}

function replaceWithBlock(
  anchorNode: LexicalNode,
  blockNode: ElementNode,
  charsToRemove: number,
) {
  anchorNode.spliceText(0, charsToRemove, '', true)
  const parent = anchorNode.getParent()
  if (parent) {
    parent.replace(blockNode)
  }
  blockNode.select()
}

function replaceWithList(
  anchorNode: LexicalNode,
  type: 'bullet' | 'number',
  charsToRemove: number,
) {
  anchorNode.spliceText(0, charsToRemove, '', true)
  const list = $createListNode(type)
  const item = $createListItemNode()
  list.append(item)
  item.append($createParagraphNode())
  const parent = anchorNode.getParent()
  if (parent) {
    parent.replace(list)
  }
  const firstChild = item.getFirstChild()
  if (firstChild) firstChild.selectStart()
}
