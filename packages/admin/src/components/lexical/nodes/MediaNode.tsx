import type {
 DOMExportOutput,
 EditorConfig,
 LexicalEditor,
 LexicalNode,
 NodeKey,
 SerializedElementNode,
 SerializedParagraphNode,
 Spread,
} from 'lexical'
import { $applyNodeReplacement, ParagraphNode } from 'lexical'

// Blob registry so createDOM() can use authenticated blob URLs instead of raw relative paths
export const mediaBlobRegistry: { url: string; blob: string }[] = []
export function registerMediaBlob(url: string, blobUrl: string): void {
 if (!mediaBlobRegistry.some((e) => e.url === url)) mediaBlobRegistry.push({ url, blob: blobUrl })
}
function getMediaBlobUrl(url: string): string | undefined {
 return mediaBlobRegistry.find((e) => e.url === url)?.blob
}

export interface MediaPayload {
 mediaId: string
 url: string
 alt: string
 mimeType: string
 width?: number
 height?: number
 thumbnailUrl?: string
 caption?: string
 key?: NodeKey
}

export type SerializedMediaNode = Spread<
 {
 mediaId: string
 url: string
 alt: string
 mimeType: string
 width?: number
 height?: number
 thumbnailUrl?: string
 caption?: string
 type: 'media'
 version: 1
 textFormat: number
 textStyle: string
 },
 SerializedElementNode
>

export class MediaNode extends ParagraphNode {
 __mediaId: string
 __url: string
 __alt: string
 __mimeType: string
 __width?: number
 __height?: number
 __thumbnailUrl?: string
 __caption?: string

 static getType(): string {
 return 'media'
 }

 static clone(node: MediaNode): MediaNode {
 return new MediaNode(
 node.__mediaId,
 node.__url,
 node.__alt,
 node.__mimeType,
 node.__width,
 node.__height,
 node.__thumbnailUrl,
 node.__caption,
 node.__key,
 )
 }

 static importDOM(): import('lexical').DOMConversionMap | null {
 return {
 div: (node: Node) => ({
 conversion: (element: HTMLElement) => {
 if (element.getAttribute('data-media-id')) {
 return {
 node: $createMediaNode({
 mediaId: element.getAttribute('data-media-id') || '',
 url: element.getAttribute('data-media-url') || '',
 mimeType: element.getAttribute('data-media-type') || '',
 alt: element.getAttribute('data-media-alt') || '',
 caption: element.getAttribute('data-media-caption') || undefined,
 }),
 }
 }
 return null
 },
 priority: 1,
 }),
 }
 }

 static importJSON(serialized: SerializedMediaNode): MediaNode {
 return $createMediaNode({
 mediaId: serialized.mediaId,
 url: serialized.url,
 alt: serialized.alt,
 mimeType: serialized.mimeType,
 width: serialized.width,
 height: serialized.height,
 thumbnailUrl: serialized.thumbnailUrl,
 caption: serialized.caption,
 })
 }

 constructor(
 mediaId: string,
 url: string,
 alt: string,
 mimeType: string,
 width?: number,
 height?: number,
 thumbnailUrl?: string,
 caption?: string,
 key?: NodeKey,
 ) {
 super(key)
 this.__mediaId = mediaId
 this.__url = url
 this.__alt = alt
 this.__mimeType = mimeType
 this.__width = width
 this.__height = height
 this.__thumbnailUrl = thumbnailUrl
 this.__caption = caption
 }

 exportDOM(): DOMExportOutput {
 const element = document.createElement('div')
 element.setAttribute('data-media-id', this.__mediaId)
 element.setAttribute('data-media-url', this.__url)
 element.setAttribute('data-media-type', this.__mimeType)
 element.setAttribute('data-media-alt', this.__alt)
 if (this.__caption) element.setAttribute('data-media-caption', this.__caption)
 return { element }
 }

 exportJSON(): SerializedMediaNode {
 const base = super.exportJSON()
 return {
 ...base,
 mediaId: this.__mediaId,
 url: this.__url,
 alt: this.__alt,
 mimeType: this.__mimeType,
 width: this.__width,
 height: this.__height,
 thumbnailUrl: this.__thumbnailUrl,
 caption: this.__caption,
 type: 'media',
 version: 1,
 } as SerializedMediaNode
 }

 createDOM(config: EditorConfig): HTMLElement {
 const wrapper = document.createElement('div')
 wrapper.className = 'lexical-media-node'
 wrapper.setAttribute('data-media-id', this.__mediaId)

 const isImage = this.__mimeType.startsWith('image/')
 const isVideo = this.__mimeType.startsWith('video/')

 if (isImage) {
 const img = document.createElement('img')
 const rawUrl = this.__thumbnailUrl || this.__url
 img.src = rawUrl.startsWith('http') ? rawUrl : (getMediaBlobUrl(rawUrl) || rawUrl)
 img.alt = this.__alt
 img.className = 'lexical-media-image'
 if (this.__width) img.width = this.__width
 wrapper.appendChild(img)
 } else if (isVideo) {
 const video = document.createElement('video')
 video.src = this.__url
 video.controls = true
 video.className = 'lexical-media-video'
 if (this.__width) video.width = this.__width
 wrapper.appendChild(video)
 } else {
 const link = document.createElement('a')
 link.href = this.__url
 link.target = '_blank'
 link.rel = 'noopener noreferrer'
 link.className = 'lexical-media-file'
 link.textContent = this.__alt || this.__url
 wrapper.appendChild(link)
 }

 if (this.__caption) {
 const caption = document.createElement('figcaption')
 caption.className = 'lexical-media-caption'
 caption.textContent = this.__caption
 wrapper.appendChild(caption)
 }

 return wrapper
 }

 updateDOM(): false {
 return false
 }

 getMediaId(): string {
 return this.__mediaId
 }

 getUrl(): string {
 return this.__url
 }

 getAlt(): string {
 return this.__alt
 }

 getMimeType(): string {
 return this.__mimeType
 }

 isInline(): false {
 return false
 }
}

export function $createMediaNode(payload: MediaPayload): MediaNode {
 return $applyNodeReplacement(
 new MediaNode(
 payload.mediaId,
 payload.url,
 payload.alt,
 payload.mimeType,
 payload.width,
 payload.height,
 payload.thumbnailUrl,
 payload.caption,
 payload.key,
 ),
 )
}

export function $isMediaNode(node: LexicalNode | null | undefined): node is MediaNode {
 return node instanceof MediaNode
}
