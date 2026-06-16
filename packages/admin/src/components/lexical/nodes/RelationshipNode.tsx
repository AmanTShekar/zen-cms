import type {
  DOMExportOutput,
  EditorConfig,
  LexicalEditor,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical'
import { $applyNodeReplacement, ParagraphNode } from 'lexical'
import type { SerializedParagraphNode } from 'lexical'

export interface RelationshipPayload {
  collectionSlug: string
  documentId: string
  label?: string
  status?: 'draft' | 'published'
  key?: NodeKey
}

export type SerializedRelationshipNode = Spread<
  {
    collectionSlug: string
    documentId: string
    label?: string
    status?: string
    type: 'relationship'
    version: 1
  },
  SerializedParagraphNode
>

export class RelationshipNode extends ParagraphNode {
  __collectionSlug: string
  __documentId: string
  __label?: string
  __status?: string

  static getType(): string {
    return 'relationship'
  }

  static clone(node: RelationshipNode): RelationshipNode {
    return new RelationshipNode(
      node.__collectionSlug,
      node.__documentId,
      node.__label,
      node.__status,
      node.__key,
    )
  }

  static importDOM(): import('lexical').DOMConversionMap | null {
    return {
      span: (node: Node) => ({
        conversion: (element: HTMLElement) => {
          if (element.getAttribute('data-rel-collection')) {
            return {
              node: $createRelationshipNode({
                collectionSlug: element.getAttribute('data-rel-collection') || '',
                documentId: element.getAttribute('data-rel-id') || '',
                label: element.getAttribute('data-rel-label') || undefined,
                status: (element.getAttribute('data-rel-status') as 'draft' | 'published') || undefined,
              }),
            }
          }
          return null
        },
        priority: 1,
      }),
    }
  }

  static importJSON(serialized: SerializedRelationshipNode): RelationshipNode {
    return $createRelationshipNode({
      collectionSlug: serialized.collectionSlug,
      documentId: serialized.documentId,
      label: serialized.label,
      status: serialized.status as 'draft' | 'published' | undefined,
    })
  }

  constructor(
    collectionSlug: string,
    documentId: string,
    label?: string,
    status?: string,
    key?: NodeKey,
  ) {
    super(key)
    this.__collectionSlug = collectionSlug
    this.__documentId = documentId
    this.__label = label
    this.__status = status
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('span')
    element.setAttribute('data-rel-collection', this.__collectionSlug)
    element.setAttribute('data-rel-id', this.__documentId)
    if (this.__label) element.setAttribute('data-rel-label', this.__label)
    if (this.__status) element.setAttribute('data-rel-status', this.__status)
    return { element }
  }

  exportJSON(): SerializedRelationshipNode {
    return {
      ...super.exportJSON(),
      collectionSlug: this.__collectionSlug,
      documentId: this.__documentId,
      label: this.__label,
      status: this.__status,
      type: 'relationship',
      version: 1,
    }
  }

  createDOM(config: EditorConfig): HTMLElement {
    const wrapper = document.createElement('span')
    wrapper.className = 'lexical-relationship-node'
    wrapper.setAttribute('data-rel-collection', this.__collectionSlug)
    wrapper.setAttribute('data-rel-id', this.__documentId)

    const icon = document.createElement('span')
    icon.className = 'lexical-relationship-icon'
    icon.textContent = '🔗'

    const text = document.createElement('span')
    text.className = 'lexical-relationship-label'
    text.textContent = this.__label || `${this.__collectionSlug}:${this.__documentId}`

    const badge = document.createElement('span')
    badge.className = `lexical-relationship-status lexical-relationship-status--${this.__status || 'published'}`
    badge.textContent = this.__status || 'published'

    wrapper.appendChild(icon)
    wrapper.appendChild(text)
    wrapper.appendChild(badge)

    return wrapper
  }

  updateDOM(): false {
    return false
  }

  getCollectionSlug(): string {
    return this.__collectionSlug
  }

  getDocumentId(): string {
    return this.__documentId
  }

  isInline(): false {
    return false
  }
}

export function $createRelationshipNode(payload: RelationshipPayload): RelationshipNode {
  return $applyNodeReplacement(
    new RelationshipNode(
      payload.collectionSlug,
      payload.documentId,
      payload.label,
      payload.status,
      payload.key,
    ),
  )
}

export function $isRelationshipNode(
  node: LexicalNode | null | undefined,
): node is RelationshipNode {
  return node instanceof RelationshipNode
}
