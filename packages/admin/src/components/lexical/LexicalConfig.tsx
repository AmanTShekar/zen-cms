import type { Klass, LexicalNode } from 'lexical'
import { CodeHighlightNode, CodeNode } from '@lexical/code'
import { HashtagNode } from '@lexical/hashtag'
import { AutoLinkNode, LinkNode } from '@lexical/link'
import { ListItemNode, ListNode } from '@lexical/list'
import { HeadingNode, QuoteNode } from '@lexical/rich-text'
import { TableCellNode, TableNode, TableRowNode } from '@lexical/table'
import { ImageNode } from './nodes/ImageNode'
import { MediaNode } from './nodes/MediaNode'
import { RelationshipNode } from './nodes/RelationshipNode'
import { HorizontalRuleNode } from './nodes/HorizontalRuleNode'

export const EDITOR_NAMESPACE = 'zenith-lexical-editor'

export function onError(error: Error) {
  console.error('[Zenith Lexical]', error)
}

export const nodes: Array<Klass<LexicalNode>> = [
  HeadingNode,
  ListNode,
  ListItemNode,
  QuoteNode,
  CodeNode,
  CodeHighlightNode,
  TableNode,
  TableCellNode,
  TableRowNode,
  HashtagNode,
  AutoLinkNode,
  LinkNode,
  ImageNode,
  MediaNode,
  RelationshipNode,
  HorizontalRuleNode,
]
