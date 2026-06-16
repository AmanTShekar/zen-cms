import type {
  DOMExportOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedElementNode,
  Spread,
} from 'lexical'
import { ParagraphNode, $applyNodeReplacement } from 'lexical'
import type { SerializedParagraphNode } from 'lexical'

export interface ImagePayload {
  alt: string
  src: string
  width?: number
  height?: number
  key?: NodeKey
}

export type SerializedImageNode = Spread<
  {
    alt: string
    src: string
    width?: number
    height?: number
    type: 'image'
    version: 1
  },
  SerializedParagraphNode
>

function $domToImageAttributes(dom: HTMLImageElement): ImagePayload {
  const width = dom.getAttribute('data-image-width')
    ? parseInt(dom.getAttribute('data-image-width')!, 10)
    : undefined
  const height = dom.getAttribute('data-image-height')
    ? parseInt(dom.getAttribute('data-image-height')!, 10)
    : undefined
  return {
    alt: dom.alt || '',
    src: dom.src || '',
    width,
    height,
  }
}

export class ImageNode extends ParagraphNode {
  __src: string
  __alt: string
  __width?: number
  __height?: number

  static getType(): string {
    return 'image'
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__alt, node.__width, node.__height, node.__key)
  }

  static importJSON(serialized: SerializedImageNode): ImageNode {
    const node = $createImageNode({
      src: serialized.src,
      alt: serialized.alt,
      width: serialized.width,
      height: serialized.height,
    })
    return node
  }

  static importDOM(): null {
    return {
      img: (domNode: HTMLElement) => ({
        conversion: (node: Element) => ({
          node: $createImageNode($domToImageAttributes(node as HTMLImageElement)),
          priority: 1,
        }),
        priority: 1,
      }),
    } as any
  }

  constructor(src: string, alt: string, width?: number, height?: number, key?: NodeKey) {
    super(key)
    this.__src = src
    this.__alt = alt
    this.__width = width
    this.__height = height
  }

  exportDOM(): DOMExportOutput {
    const element = document.createElement('img')
    element.setAttribute('src', this.__src)
    element.setAttribute('alt', this.__alt)
    if (this.__width) element.setAttribute('data-image-width', String(this.__width))
    if (this.__height) element.setAttribute('data-image-height', String(this.__height))
    return { element }
  }

  exportJSON(): SerializedImageNode {
    return {
      ...super.exportJSON(),
      alt: this.__alt,
      src: this.__src,
      width: this.__width,
      height: this.__height,
      type: 'image' as const,
      version: 1 as const,
    }
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span')
    const img = document.createElement('img')
    img.src = this.__src
    img.alt = this.__alt
    img.className = 'lexical-image'
    if (this.__width) {
      img.width = this.__width
      img.setAttribute('data-image-width', String(this.__width))
    }
    if (this.__height) {
      img.height = this.__height
      img.setAttribute('data-image-height', String(this.__height))
    }
    span.appendChild(img)
    return span
  }

  updateDOM(): false {
    return false
  }

  getSrc(): string {
    return this.__src
  }

  getAlt(): string {
    return this.__alt
  }

  setAlt(alt: string): void {
    const writable = this.getWritable()
    writable.__alt = alt
  }

  isInline(): false {
    return false
  }
}

export function $createImageNode({ src, alt, width, height, key }: ImagePayload): ImageNode {
  return $applyNodeReplacement(new ImageNode(src, alt, width, height, key))
}

export function $isImageNode(node: LexicalNode | null | undefined): node is ImageNode {
  return node instanceof ImageNode
}
